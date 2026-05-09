import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useCategories } from "@/hooks/useCategories"
import { usePayers } from "@/hooks/usePayers"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Sheet } from "@/components/Sheet"
import type { TransactionKind, RecurringTemplate } from "@/lib/types"
type Frequency = "daily" | "weekly" | "monthly" | "yearly"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: RecurringTemplate | null
}

const FREQS: { id: Frequency; label: string }[] = [
  { id: "daily",   label: "Diario" },
  { id: "weekly",  label: "Semanal" },
  { id: "monthly", label: "Mensual" },
  { id: "yearly",  label: "Anual" },
]

function todayLocal(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
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
  const [frequency, setFrequency] = useState<Frequency>("monthly")
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [startDate, setStartDate] = useState(todayLocal())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
      setDayOfMonth(editing.day_of_month ?? 1)
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
      setDayOfMonth(new Date().getDate() > 28 ? 1 : new Date().getDate())
      setStartDate(todayLocal())
    }
    setError(null)
  }, [open, editing, payers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount.replace(",", "."))
    if (isNaN(amountNum) || amountNum <= 0) return setError("Monto inválido")
    if (!title.trim()) return setError("Falta el título")

    setSaving(true)
    const payload = {
      user_id: user!.id, kind, amount_bs: amountNum,
      title: title.trim(), note: note.trim() || null,
      category_id: categoryId, payer_id: payerId,
      frequency,
      day_of_month: frequency === "monthly" ? dayOfMonth : null,
      start_date: startDate,
      next_run_date: startDate,
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

  async function handleDelete() {
    if (!editing) return
    if (!confirm("¿Eliminar este recurrente? Las transacciones ya creadas se mantienen.")) return
    setDeleting(true)
    const { error: err } = await supabase.from("recurring_templates").delete().eq("id", editing.id)
    setDeleting(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Editar recurrente" : "Nuevo recurrente"}
      footer={
        <div className="flex gap-2">
          {editing && (
            <motion.button
              type="button" onClick={handleDelete}
              disabled={deleting || saving}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-red-400 hover:bg-red-900/40 transition disabled:opacity-50"
            >
              <Trash2 size={18} />
            </motion.button>
          )}
          <motion.button
            type="submit" form="recurring-form"
            disabled={saving || deleting}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
            className="flex-1 rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : editing ? "Actualizar" : "Crear recurrente"}
          </motion.button>
        </div>
      }
    >
      <form id="recurring-form" onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button type="button" onClick={() => { setKind("expense"); setCategoryId(null) }}
            className={cn("py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
              kind === "expense" ? "bg-red-500/20 text-red-400 shadow-inner" : "text-zinc-500")}>
            Gasto
          </button>
          <button type="button" onClick={() => { setKind("income"); setCategoryId(null) }}
            className={cn("py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
              kind === "income" ? "bg-emerald-500/20 text-emerald-400 shadow-inner" : "text-zinc-500")}>
            Ingreso
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Monto (Bs)</label>
          <input type="text" inputMode="decimal" required value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600 transition-colors"
            placeholder="0,00" autoFocus={!editing} />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">¿Qué?</label>
          <input type="text" required value={title}
            onChange={e => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
            placeholder="Alquiler, Mesada, Gym..." />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Frecuencia</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {FREQS.map(f => (
              <button key={f.id} type="button" onClick={() => setFrequency(f.id)}
                className={cn("py-2 rounded-lg text-xs font-medium border transition active:scale-95",
                  frequency === f.id
                    ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700")}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {frequency === "monthly" && (
          <div>
            <label className="text-xs font-medium text-zinc-400">Día del mes</label>
            <input type="number" min={1} max={28} required value={dayOfMonth}
              onChange={e => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
            />
            <p className="text-[11px] text-zinc-600 mt-1.5 leading-snug">
              Días 29-31 no disponibles para evitar problemas en febrero
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-400">Empieza desde</label>
          <input type="date" required value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]"
          />
        </div>

        {kind === "expense" && (
          <div>
            <label className="text-xs font-medium text-zinc-400">Pagado por</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {payers.map(p => (
                <button key={p.id} type="button" onClick={() => setPayerId(p.id)}
                  className={cn("px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95",
                    payerId === p.id
                      ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700")}>
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
              <button key={c.id} type="button"
                onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                className={cn("px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95",
                  categoryId === c.id
                    ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700")}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600 transition-colors"
            placeholder="Detalles..." />
        </div>

        {error && (
          <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>
        )}
      </form>
    </Sheet>
  )
}
