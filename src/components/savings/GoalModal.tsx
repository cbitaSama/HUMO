import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { Sheet } from "@/components/Sheet"
import type { SavingsGoal } from "@/lib/types"

const EMOJIS = ["💰","🏦","✈️","🏖️","🏠","🚗","🛵","💍","🎓","💻","📱","🎁","🎮","🎸","💪","🧘","👶","🐶","🌱","🎯"]
const COLORS = [
  "#22c55e","#10b981","#06b6d4","#3b82f6","#6366f1","#8b5cf6",
  "#a855f7","#ec4899","#f43f5e","#ef4444","#f97316","#eab308",
]

type Props = {
  open: boolean
  onClose: () => void
  editing?: SavingsGoal | null
}

export function GoalModal({ open, onClose, editing }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [color, setColor] = useState(COLORS[0])
  const [target, setTarget] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setEmoji(editing.emoji)
      setColor(editing.color)
      setTarget(editing.target_amount_bs ? String(editing.target_amount_bs) : "")
      setTargetDate(editing.target_date ?? "")
    } else {
      setName("")
      setEmoji(EMOJIS[0])
      setColor(COLORS[0])
      setTarget("")
      setTargetDate("")
    }
    setError(null)
  }, [open, editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Falta el nombre")
    setSaving(true); setError(null)
    const targetNum = target ? parseFloat(target.replace(",", ".")) : null
    const payload = {
      user_id: user!.id,
      name: name.trim(), emoji, color,
      target_amount_bs: targetNum,
      target_date: targetDate || null,
    }
    const { error: err } = editing
      ? await supabase.from("savings_goals").update(payload).eq("id", editing.id)
      : await supabase.from("savings_goals").insert(payload)
    if (err) { setSaving(false); return setError(err.message) }
    await qc.invalidateQueries({ queryKey: ["savings_goals"] })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!editing || editing.is_default) return
    if (!confirm("¿Eliminar esta meta? Los movimientos ya creados se mantienen como transacciones.")) return
    setDeleting(true)
    await supabase.from("savings_goals").delete().eq("id", editing.id)
    await qc.invalidateQueries({ queryKey: ["savings_goals"] })
    setDeleting(false)
    onClose()
  }

  return (
    <Sheet
      open={open} onClose={onClose}
      title={editing ? "Editar meta" : "Nueva meta"}
      footer={
        <div className="flex gap-2">
          {editing && !editing.is_default && (
            <motion.button type="button" onClick={handleDelete}
              disabled={deleting || saving}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-red-400 hover:bg-red-900/40 transition disabled:opacity-50">
              <Trash2 size={18} />
            </motion.button>
          )}
          <motion.button type="submit" form="goal-form"
            disabled={saving || deleting}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
            className="flex-1 rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
            {saving ? "Guardando..." : editing ? "Actualizar" : "Crear meta"}
          </motion.button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
               style={{ background: color + "33", border: `2px solid ${color}` }}>
            {emoji}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Nombre</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
            placeholder="Vacaciones, Moto, Emergencias..." autoFocus />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Emoji</label>
          <div className="mt-2 grid grid-cols-10 gap-1.5">
            {EMOJIS.map(em => (
              <button key={em} type="button" onClick={() => setEmoji(em)}
                className={cn("aspect-square rounded-lg text-lg transition-all active:scale-90",
                  emoji === em ? "bg-zinc-50 scale-105" : "bg-zinc-900 hover:bg-zinc-800")}>
                {em}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Color</label>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn("aspect-square rounded-xl transition-all active:scale-90",
                  color === c ? "ring-2 ring-zinc-50 ring-offset-2 ring-offset-zinc-950 scale-105" : "")}
                style={{ background: c }} />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Meta (Bs) — opcional</label>
          <input type="text" inputMode="decimal" value={target}
            onChange={e => setTarget(e.target.value.replace(/[^0-9.,]/g, ""))}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
            placeholder="Cuánto querés juntar" />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Fecha objetivo — opcional</label>
          <input type="date" value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]" />
        </div>

        {editing?.is_default && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-400">
            Esta es tu meta por defecto. No se puede eliminar pero podés editarla.
          </div>
        )}

        {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}
      </form>
    </Sheet>
  )
}
