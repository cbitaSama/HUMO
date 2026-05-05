import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useCategories } from "@/hooks/useCategories"
import { usePayers } from "@/hooks/usePayers"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { TransactionKind, RecurrenceFrequency, RecurringTemplate } from "@/lib/types"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: RecurringTemplate | null
}

export function RecurringModal({ open, onClose, onSaved, editing }: Props) {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { payers } = usePayers(user?.id)

  const [kind, setKind] = useState<TransactionKind>("expense")
  const [amount, setAmount] = useState("")
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [payerId, setPayerId] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly")
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = useMemo(
    () => categories.filter(c => c.kind === kind || c.kind === "both"),
    [categories, kind]
  )

  useEffect(() => {
    if (!open) return
    if (editing) {
      setKind(editing.kind)
      setAmount(String(editing.amount_bs))
      setTitle(editing.title)
      setNote(editing.note ?? "")
      setCategoryId(editing.category_id)
      setPayerId(editing.payer_id)
      setFrequency(editing.frequency)
      setDayOfMonth(String(editing.day_of_month ?? 1))
      setStartDate(editing.start_date)
    } else {
      setKind("expense")
      setAmount("")
      setTitle("")
      setNote("")
      setCategoryId(null)
      const self = payers.find(p => p.is_self)
      setPayerId(self?.id ?? null)
      setFrequency("monthly")
      setDayOfMonth(String(new Date().getDate()))
      setStartDate(new Date().toISOString().slice(0, 10))
    }
    setError(null)
  }, [open, editing, payers])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  function nextRunFrom(start: string, freq: RecurrenceFrequency, dom: number): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startD = new Date(start + "T12:00:00")

    if (freq !== "monthly") {
      return startD < today ? today.toISOString().slice(0, 10) : start
    }

    // Mensual: encontrar el próximo día-del-mes en o después de la fecha de inicio
    let candidate = new Date(startD.getFullYear(), startD.getMonth(), Math.min(dom, 28))
    while (candidate < today || candidate < startD) {
      candidate = new Date(candidate.getFullYear(), candidate.getMonth() + 1, Math.min(dom, 28))
    }
    return candidate.toISOString().slice(0, 10)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount.replace(",", "."))
    if (isNaN(amountNum) || amountNum <= 0) return setError("Monto inválido")
    if (!title.trim()) return setError("Falta el título")

    setSaving(true)

    const dom = frequency === "monthly" ? parseInt(dayOfMonth) : null
    const next_run_date = nextRunFrom(startDate, frequency, dom ?? 1)

    const payload = {
      user_id: user!.id,
      kind,
      amount_bs: amountNum,
      title: title.trim(),
      note: note.trim() || null,
      category_id: categoryId,
      payer_id: payerId,
      frequency,
      interval_count: 1,
      day_of_month: dom,
      day_of_week: null,
      start_date: startDate,
      next_run_date,
      active: true,
    }

    const { error: err } = editing
      ? await supabase.from("recurring_templates").update(payload).eq("id", editing.id)
      : await supabase.from("recurring_templates").insert(payload)

    setSaving(false)
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
          <h2 className="text-lg font-semibold">
            {editing ? "Editar recurrente" : "Nuevo recurrente"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">

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

          <div>
            <label className="text-xs font-medium text-zinc-400">Monto fijo (Bs)</label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Nombre *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600"
              placeholder={kind === "expense" ? "Alquiler, Netflix, gimnasio..." : "Mesada, sueldo..."}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Frecuencia</label>
            <div className="mt-1 grid grid-cols-4 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              {(["daily","weekly","monthly","yearly"] as RecurrenceFrequency[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium transition-colors",
                    frequency === f ? "bg-zinc-800 text-zinc-50" : "text-zinc-500"
                  )}
                >
                  {f === "daily" ? "Diario" : f === "weekly" ? "Semanal" : f === "monthly" ? "Mensual" : "Anual"}
                </button>
              ))}
            </div>
          </div>

          {frequency === "monthly" && (
            <div>
              <label className="text-xs font-medium text-zinc-400">Día del mes</label>
              <input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600"
              />
              <p className="text-[11px] text-zinc-600 mt-1">
                Días 29-31 no disponibles para evitar problemas en febrero
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400">Empieza desde</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 [color-scheme:dark]"
            />
          </div>

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
                        : "bg-zinc-900 text-zinc-400 border-zinc-800"
                    )}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  )}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600"
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
            {saving ? "Guardando..." : editing ? "Actualizar" : "Crear recurrente"}
          </button>
        </form>
      </div>
    </div>
  )
}
