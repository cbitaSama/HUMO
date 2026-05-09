import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Sheet } from "@/components/Sheet"
import type { Payer } from "@/lib/types"

const ICONS = ["👤","🧍","👨","👩","🧑","👴","👵","👦","👧","🧓","👨‍🎓","👩‍🎓","💼","🏢","💰","🤝"]
const COLORS = [
  "#6366f1","#3b82f6","#06b6d4","#10b981","#22c55e","#84cc16",
  "#eab308","#f97316","#ef4444","#ec4899","#a855f7","#8b5cf6",
]

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Payer | null
}

export function PayerModal({ open, onClose, onSaved, editing }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [icon, setIcon] = useState(ICONS[0])
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) { setName(editing.name); setIcon(editing.icon); setColor(editing.color) }
    else         { setName(""); setIcon(ICONS[0]); setColor(COLORS[0]) }
    setError(null)
  }, [open, editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Falta el nombre")
    setSaving(true); setError(null)
    const payload = { user_id: user!.id, name: name.trim(), icon, color }
    const { error: err } = editing
      ? await supabase.from("payers").update(payload).eq("id", editing.id)
      : await supabase.from("payers").insert({ ...payload, is_self: false })
    if (err) { setSaving(false); return setError(err.message) }
    await qc.invalidateQueries({ queryKey: ["payers"] })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Sheet
      open={open} onClose={onClose}
      title={editing ? "Editar pagador" : "Nuevo pagador"}
      footer={
        <motion.button type="submit" form="payer-form"
          disabled={saving}
          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
          {saving ? "Guardando..." : editing ? "Actualizar" : "Crear pagador"}
        </motion.button>
      }
    >
      <form id="payer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
               style={{ background: color + "33", border: `2px solid ${color}` }}>{icon}</div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Nombre</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
            placeholder="Tía María, Hermano, Pareja..." autoFocus />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Ícono</label>
          <div className="mt-2 grid grid-cols-8 gap-2">
            {ICONS.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                className={cn("aspect-square rounded-xl text-xl transition-all active:scale-90",
                  icon === i ? "bg-zinc-50 scale-105" : "bg-zinc-900 hover:bg-zinc-800")}>
                {i}
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

        {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}
      </form>
    </Sheet>
  )
}
