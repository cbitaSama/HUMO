import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { X, Trash2, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import type { Debt, DebtDirection } from "@/lib/types"
import { createInitialTxForDebt, deleteTxById } from "@/lib/debts"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Debt | null
}

export function DebtModal({ open, onClose, onSaved, editing }: Props) {
  const { user } = useAuth()
  const [direction, setDirection] = useState<DebtDirection>("owed_to_me")
  const [counterparty, setCounterparty] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [autoCreate, setAutoCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setDirection(editing.direction)
      setCounterparty(editing.counterparty_name)
      setAmount(String(editing.amount_bs))
      setDescription(editing.description ?? "")
      setAutoCreate(editing.auto_create_transaction)
    } else {
      setDirection("owed_to_me")
      setCounterparty("")
      setAmount("")
      setDescription("")
      setAutoCreate(false)
    }
    setError(null)
  }, [open, editing])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount.replace(",", "."))
    if (isNaN(amountNum) || amountNum <= 0) return setError("Monto inválido")
    if (!counterparty.trim()) return setError("Falta el nombre")

    setSaving(true)

    if (editing) {
      const { error: err } = await supabase.from("debts").update({
        direction, counterparty_name: counterparty.trim(),
        amount_bs: amountNum, description: description.trim() || null,
      }).eq("id", editing.id)
      setSaving(false)
      if (err) return setError(err.message)
    } else {
      const { data: created, error: err } = await supabase.from("debts").insert({
        user_id: user!.id,
        direction,
        counterparty_name: counterparty.trim(),
        amount_bs: amountNum,
        description: description.trim() || null,
        status: "open",
        auto_create_transaction: autoCreate,
      }).select().single()

      if (err) { setSaving(false); return setError(err.message) }

      // Si auto, crear transacción inicial y guardar su id
      if (autoCreate && created) {
        const txId = await createInitialTxForDebt(created as Debt)
        if (txId) {
          await supabase.from("debts").update({ initial_transaction_id: txId }).eq("id", created.id)
        }
      }
      setSaving(false)
    }

    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    const hasTx = editing.initial_transaction_id || editing.settlement_transaction_id
    const confirmMsg = hasTx
      ? "¿Eliminar esta deuda y los movimientos creados automáticamente?"
      : "¿Eliminar esta deuda?"
    if (!confirm(confirmMsg)) return

    setDeleting(true)
    if (hasTx) {
      await deleteTxById(editing.initial_transaction_id)
      await deleteTxById(editing.settlement_transaction_id)
    }
    const { error: err } = await supabase.from("debts").delete().eq("id", editing.id)
    setDeleting(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
  }

  if (!open) return null

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
          <h2 className="text-lg font-semibold">{editing ? "Editar préstamo" : "Nuevo préstamo"}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 active:scale-90 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => setDirection("owed_to_me")}
              className={cn(
                "py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                direction === "owed_to_me" ? "bg-emerald-500/20 text-emerald-400 shadow-inner" : "text-zinc-500"
              )}
            >
              Me deben
            </button>
            <button
              type="button"
              onClick={() => setDirection("i_owe")}
              className={cn(
                "py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                direction === "i_owe" ? "bg-red-500/20 text-red-400 shadow-inner" : "text-zinc-500"
              )}
            >
              Yo debo
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Monto (Bs)</label>
            <input
              type="text" inputMode="decimal" required
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600"
              placeholder="0,00"
              autoFocus={!editing}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              {direction === "owed_to_me" ? "¿Quién te debe?" : "¿A quién le debés?"}
            </label>
            <input
              type="text" required
              value={counterparty}
              onChange={e => setCounterparty(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600"
              placeholder="Nombre"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">¿Por qué? (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600"
              placeholder="Préstamo en efectivo, etc."
            />
          </div>

          {/* Auto toggle */}
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
                    {direction === "owed_to_me"
                      ? "Te baja el balance ahora (saliste plata) y te sube cuando te paguen."
                      : "Te sube el balance ahora (entró plata) y te baja cuando devuelvas."}
                  </p>
                </div>
              </div>
            </button>
          )}

          {editing && editing.auto_create_transaction && (
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3 text-xs text-purple-300">
              ⚡ Esta deuda tiene movimientos automáticos vinculados.
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
