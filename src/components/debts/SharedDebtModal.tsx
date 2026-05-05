import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn, formatBs } from "@/lib/utils"
import { X, Trash2, Zap, Plus, Divide } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { DebtGroup, DebtGroupParticipant } from "@/lib/types"
import { createInitialTxForGroup, deleteTxById } from "@/lib/debts"

type ParticipantInput = {
  id: string
  dbId?: string
  name: string
  amount: string
  settled?: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: { group: DebtGroup; participants: DebtGroupParticipant[] } | null
}

export function SharedDebtModal({ open, onClose, onSaved, editing }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [total, setTotal] = useState("")
  const [description, setDescription] = useState("")
  const [autoCreate, setAutoCreate] = useState(false)
  const [yourShare, setYourShare] = useState("")
  const [parts, setParts] = useState<ParticipantInput[]>([])
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalNum = parseFloat(total.replace(",", ".")) || 0
  const yourShareNum = parseFloat(yourShare.replace(",", ".")) || 0
  const partsSum = useMemo(
    () => parts.reduce((s, p) => s + (parseFloat(p.amount.replace(",", ".")) || 0), 0),
    [parts]
  )
  const allocated = yourShareNum + partsSum
  const remaining = totalNum - allocated

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.group.title)
      setTotal(String(editing.group.total_amount_bs))
      setDescription(editing.group.description ?? "")
      setAutoCreate(editing.group.auto_create_transaction)
      const partsSumLoaded = editing.participants.reduce((s, p) => s + Number(p.amount_bs), 0)
      const yourShareLoaded = Math.max(0, Number(editing.group.total_amount_bs) - partsSumLoaded)
      setYourShare(yourShareLoaded.toFixed(2))
      setParts(editing.participants.map(p => ({
        id: p.id,
        dbId: p.id,
        name: p.name,
        amount: String(p.amount_bs),
        settled: p.status === "settled",
      })))
    } else {
      setTitle("")
      setTotal("")
      setDescription("")
      setAutoCreate(false)
      setYourShare("")
      setParts([])
    }
    setNewName("")
    setError(null)
  }, [open, editing])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  function addParticipant() {
    if (!newName.trim()) return
    setParts(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newName.trim(),
      amount: "",
    }])
    setNewName("")
  }

  function removeParticipant(id: string) {
    setParts(prev => prev.filter(p => p.id !== id))
  }

  function updatePart(id: string, key: "name" | "amount", value: string) {
    setParts(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p))
  }

  // Divide entre todos: Yo + N participantes
  function divideEqually() {
    if (parts.length === 0 || totalNum <= 0) return
    const N = parts.length
    const each = +(totalNum / (N + 1)).toFixed(2)
    // Yo absorbe el redondeo para que la suma sea exacta
    const yours = +(totalNum - each * N).toFixed(2)
    setYourShare(yours.toFixed(2))
    setParts(prev => prev.map(p => ({ ...p, amount: each.toFixed(2) })))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError("Falta el título")
    if (totalNum <= 0) return setError("Monto total inválido")
    if (parts.length === 0) return setError("Agregá al menos una persona")
    if (parts.some(p => !p.name.trim())) return setError("Hay un participante sin nombre")
    if (parts.some(p => (parseFloat(p.amount.replace(",", ".")) || 0) <= 0))
      return setError("Cada participante necesita un monto > 0")
    if (yourShareNum < 0) return setError("Tu parte no puede ser negativa")
    if (allocated > totalNum + 0.01) return setError("La suma supera el total")
    if (allocated < totalNum - 0.01) return setError(`Falta repartir ${formatBs(remaining)}`)

    setSaving(true)

    if (editing) {
      const { error: gErr } = await supabase.from("debt_groups").update({
        title: title.trim(),
        total_amount_bs: totalNum,
        description: description.trim() || null,
      }).eq("id", editing.group.id)
      if (gErr) { setSaving(false); return setError(gErr.message) }

      const existingIds = editing.participants.map(p => p.id)
      const currentIds = parts.filter(p => p.dbId).map(p => p.dbId!)
      const toDelete = existingIds.filter(id => !currentIds.includes(id))

      if (toDelete.length > 0) {
        await supabase.from("debt_group_participants").delete().in("id", toDelete)
      }

      for (const p of parts) {
        const amt = parseFloat(p.amount.replace(",", "."))
        if (p.dbId) {
          await supabase.from("debt_group_participants").update({
            name: p.name.trim(),
            amount_bs: amt,
          }).eq("id", p.dbId)
        } else {
          await supabase.from("debt_group_participants").insert({
            group_id: editing.group.id,
            user_id: user!.id,
            name: p.name.trim(),
            amount_bs: amt,
            status: "open",
          })
        }
      }
    } else {
      const { data: created, error: gErr } = await supabase.from("debt_groups").insert({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        total_amount_bs: totalNum,
        auto_create_transaction: autoCreate,
      }).select().single()

      if (gErr || !created) { setSaving(false); return setError(gErr?.message ?? "Error") }

      const rows = parts.map(p => ({
        group_id: created.id,
        user_id: user!.id,
        name: p.name.trim(),
        amount_bs: parseFloat(p.amount.replace(",", ".")),
        status: "open" as const,
      }))
      const { error: pErr } = await supabase.from("debt_group_participants").insert(rows)
      if (pErr) { setSaving(false); return setError(pErr.message) }

      if (autoCreate) {
        const txId = await createInitialTxForGroup(created as DebtGroup)
        if (txId) {
          await supabase.from("debt_groups").update({ initial_transaction_id: txId }).eq("id", created.id)
        }
      }
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    const hasInitial = editing.group.initial_transaction_id
    const settledTxs = editing.participants
      .filter(p => p.settlement_transaction_id)
      .map(p => p.settlement_transaction_id!)
    const total = (hasInitial ? 1 : 0) + settledTxs.length
    const msg = total > 0
      ? `¿Eliminar este grupo y los ${total} movimiento(s) automático(s) creados?`
      : "¿Eliminar este grupo?"
    if (!confirm(msg)) return

    setDeleting(true)
    if (hasInitial) await deleteTxById(hasInitial)
    for (const txId of settledTxs) await deleteTxById(txId)
    await supabase.from("debt_groups").delete().eq("id", editing.group.id)
    setDeleting(false)
    onSaved()
    onClose()
  }

  if (!open) return null

  // Estado del summary visual
  const summaryStatus =
    allocated > totalNum + 0.01 ? "over" :
    allocated < totalNum - 0.01 ? "under" :
    "ok"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full md:max-w-md bg-zinc-950 border-t md:border border-zinc-800 md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">
            {editing ? "Editar gasto compartido" : "Nuevo gasto compartido"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 active:scale-90 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">

          <div>
            <label className="text-xs font-medium text-zinc-400">¿Qué pagaste?</label>
            <input
              type="text" required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600"
              placeholder="Cena del viernes, viaje, alquiler..."
              autoFocus={!editing}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Total que pagaste (Bs)</label>
            <input
              type="text" inputMode="decimal" required
              value={total}
              onChange={e => setTotal(e.target.value.replace(/[^0-9.,]/g, ""))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600"
              placeholder="0,00"
            />
          </div>

          {/* División */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400">División del total</label>
              {parts.length > 0 && totalNum > 0 && (
                <button
                  type="button"
                  onClick={divideEqually}
                  className="flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 active:scale-95 transition"
                >
                  <Divide size={11} /> Dividir igual entre todos
                </button>
              )}
            </div>

            {/* Tu parte — fila especial */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-200 font-medium flex items-center gap-2">
                <span>🧍</span>
                <span>Tu parte</span>
              </div>
              <div className="relative w-24">
                <input
                  type="text" inputMode="decimal"
                  value={yourShare}
                  onChange={e => setYourShare(e.target.value.replace(/[^0-9.,]/g, ""))}
                  className="w-full rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2 text-sm tabular-nums outline-none focus:border-purple-500/60 pr-8 text-purple-100"
                  placeholder="0,00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-purple-400/60">Bs</span>
              </div>
              <div className="w-7" />
            </div>

            {/* Add new */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addParticipant() } }}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-zinc-600"
                placeholder="Nombre de quien te debe + Enter"
              />
              <button
                type="button"
                onClick={addParticipant}
                disabled={!newName.trim()}
                className="rounded-xl bg-zinc-800 px-3 py-2.5 hover:bg-zinc-700 active:scale-95 transition disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              {parts.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updatePart(p.id, "name", e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                  />
                  <div className="relative w-24">
                    <input
                      type="text" inputMode="decimal"
                      value={p.amount}
                      onChange={e => updatePart(p.id, "amount", e.target.value.replace(/[^0-9.,]/g, ""))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-600 pr-8"
                      placeholder="0,00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">Bs</span>
                  </div>
                  {!p.settled ? (
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.id)}
                      className="text-zinc-500 hover:text-red-400 active:scale-90 p-1.5 transition"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <div className="text-[10px] text-emerald-400 font-medium px-1.5 w-7 text-center">✓</div>
                  )}
                </div>
              ))}
            </div>

            {/* Live summary */}
            {totalNum > 0 && (
              <div className={cn(
                "mt-3 p-3 rounded-xl border text-xs space-y-1 transition-colors",
                summaryStatus === "ok"   && "border-emerald-500/30 bg-emerald-500/5",
                summaryStatus === "over" && "border-red-500/30 bg-red-500/5",
                summaryStatus === "under"&& "border-amber-500/30 bg-amber-500/5"
              )}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Asignado</span>
                  <span className="tabular-nums font-medium">
                    {formatBs(allocated)} <span className="text-zinc-600">/ {formatBs(totalNum)}</span>
                  </span>
                </div>
                {summaryStatus === "ok" && (
                  <p className="text-emerald-400 text-[11px]">✓ Todo cuadra</p>
                )}
                {summaryStatus === "over" && (
                  <p className="text-red-400 text-[11px]">
                    Te pasaste por {formatBs(allocated - totalNum)}
                  </p>
                )}
                {summaryStatus === "under" && (
                  <p className="text-amber-400 text-[11px]">
                    Faltan {formatBs(totalNum - allocated)} por repartir
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600"
              placeholder="Detalles..."
            />
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => setAutoCreate(v => !v)}
              className={cn(
                "w-full p-4 rounded-xl border transition-all text-left active:scale-[0.99]",
                autoCreate
                  ? "border-purple-500/40 bg-purple-500/10"
                  : "border-zinc-800 bg-zinc-900"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  autoCreate ? "bg-purple-500/30" : "bg-zinc-800"
                )}>
                  <Zap size={18} className={autoCreate ? "text-purple-300" : "text-zinc-500"} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Auto-registrar movimientos</p>
                    <div className={cn(
                      "w-9 h-5 rounded-full p-0.5 transition-colors shrink-0",
                      autoCreate ? "bg-purple-500" : "bg-zinc-700"
                    )}>
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform",
                        autoCreate && "translate-x-4"
                      )} />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Crea el gasto inicial ahora, y un ingreso por cada amigo cuando te paguen.
                  </p>
                </div>
              </div>
            </button>
          )}

          {editing && editing.group.auto_create_transaction && (
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3 text-xs text-purple-300">
              ⚡ Este grupo tiene movimientos automáticos vinculados.
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-red-400 hover:bg-red-900/40 transition active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
