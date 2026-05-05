import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useCategories } from "@/hooks/useCategories"
import { usePayers } from "@/hooks/usePayers"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { TransactionKind } from "@/lib/types"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function QuickAddModal({ open, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { payers } = usePayers(user?.id)

  const [kind, setKind] = useState<TransactionKind>("expense")
  const [amount, setAmount] = useState("")
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [payerId, setPayerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = useMemo(
    () => categories.filter(c => c.kind === kind || c.kind === "both"),
    [categories, kind]
  )

  // Default payer = "Yo" cuando se abre el modal
  useEffect(() => {
    if (open && payers.length > 0 && !payerId) {
      const self = payers.find(p => p.is_self)
      if (self) setPayerId(self.id)
    }
  }, [open, payers, payerId])

  // Reset form al cerrar
  useEffect(() => {
    if (!open) {
      setAmount("")
      setTitle("")
      setNote("")
      setCategoryId(null)
      setPayerId(null)
      setError(null)
      setKind("expense")
    }
  }, [open])

  // Bloquear scroll del fondo cuando está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount.replace(",", "."))
    if (isNaN(amountNum) || amountNum <= 0) return setError("Monto inválido")
    if (!title.trim()) return setError("Falta el título")

    setSaving(true)

    const { error: insErr } = await supabase.from("transactions").insert({
      user_id: user!.id,
      kind,
      amount_bs: amountNum,
      title: title.trim(),
      note: note.trim() || null,
      category_id: categoryId,
      payer_id: payerId,
      occurred_at: new Date().toISOString(),
    })

    setSaving(false)

    if (insErr) return setError(insErr.message)

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
        {/* Handle móvil */}
        <div className="md:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">Nuevo movimiento</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">

          {/* Toggle gasto/ingreso */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => { setKind("expense"); setCategoryId(null) }}
              className={cn(
                "py-2 rounded-lg text-sm font-medium transition-colors",
                kind === "expense" ? "bg-red-500/20 text-red-400" : "text-zinc-500"
              )}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => { setKind("income"); setCategoryId(null) }}
              className={cn(
                "py-2 rounded-lg text-sm font-medium transition-colors",
                kind === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500"
              )}
            >
              Ingreso
            </button>
          </div>

          {/* Monto — protagonista */}
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
              autoFocus
            />
          </div>

          {/* Título */}
          <div>
            <label className="text-xs font-medium text-zinc-400">¿Qué? *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
              placeholder={kind === "expense" ? "Almuerzo, Uber, café..." : "Mesada, sueldo..."}
            />
          </div>

          {/* Pagador chips (solo para gastos) */}
          {kind === "expense" && (
            <div>
              <label className="text-xs font-medium text-zinc-400">Pagado por</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {payers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPayerId(p.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                      payerId === p.id
                        ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categoría chips */}
          <div>
            <label className="text-xs font-medium text-zinc-400">Categoría</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredCategories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    categoryId === c.id
                      ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Nota opcional */}
          <div>
            <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600 transition-colors"
              placeholder="Detalles..."
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  )
}
