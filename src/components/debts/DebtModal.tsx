import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { X, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import type { Debt, DebtDirection } from "@/lib/types"

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
    } else {
      setDirection("owed_to_me")
      setCounterparty("")
      setAmount("")
      setDescription("")
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
    if (!counterparty.trim()) return setError("¿Quién es la persona?")

    setSaving(true)
    const payload = {
      user_id: user!.id,
      direction,
      counterparty_name: counterparty.trim(),
      amount_bs: amountNum,
      description: description.trim() || null,
    }
    const { error: err } = editing
      ? await supabase.from("debts").update(payload).eq("id", editing.id)
      : await supabase.from("debts").insert({ ...payload, status: "open" })

    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm("¿Eliminar esta deuda?")) return
    setDeleting(true)
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
          <h2 className="text-lg font-semibold">{editing ? "Editar deuda" : "Nueva deuda"}</h2>
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
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600 transition-colors"
              placeholder="0,00"
              autoFocus={!editing}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              {direction === "owed_to_me" ? "¿Quién te debe?" : "¿A quién le debés?"}
            </label>
            <input
              type="text"
              required
              value={counterparty}
              onChange={e => setCounterparty(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
              placeholder="Nombre de la persona"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">¿Por qué? (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600 transition-colors"
              placeholder="Cena del viernes, préstamo, etc."
            />
          </div>

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
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear deuda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
