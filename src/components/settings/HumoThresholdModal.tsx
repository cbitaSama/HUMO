import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useQueryClient } from "@tanstack/react-query"
import { Flame } from "lucide-react"
import { SettingsModal } from "./Modal"
import { formatBs } from "@/lib/utils"

type Props = {
  open: boolean
  onClose: () => void
  current: number
  userId: string
  onSaved: () => void
}

const PRESETS = [10, 20, 30, 50, 100]

export function HumoThresholdModal({ open, onClose, current, userId, onSaved }: Props) {
  const qc = useQueryClient()
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setValue(current) }, [open, current])

  async function save() {
    setSaving(true)
    await supabase.from("profiles").update({ humo_threshold_bs: value }).eq("id", userId)
    await qc.invalidateQueries({ queryKey: ["profile"] })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <SettingsModal open={open} onClose={onClose} title="Humbral del Humómetro">
      <div className="space-y-6">
        <div className="rounded-2xl border border-orange-900/40 bg-gradient-to-br from-orange-950/30 to-zinc-900 p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="flex items-center gap-2 mb-3 relative">
            <Flame size={16} className="text-orange-400" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Cuenta como humo</p>
          </div>
          <p className="text-4xl font-bold tracking-tight text-orange-400 relative">
            &lt; {formatBs(value)}
          </p>
          <p className="text-xs text-zinc-500 mt-2 relative">Cualquier gasto menor a este monto</p>
        </div>

        <div>
          <input type="range" min={5} max={200} step={1}
            value={value} onChange={e => setValue(Number(e.target.value))}
            className="w-full accent-orange-400" />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>Bs 5</span><span>Bs 200</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <motion.button key={p} whileTap={{ scale: 0.94 }} onClick={() => setValue(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                value === p ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}>
              Bs {p}
            </motion.button>
          ))}
        </div>

        <motion.button onClick={save} disabled={saving}
          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
          {saving ? "Guardando..." : "Aplicar"}
        </motion.button>
      </div>
    </SettingsModal>
  )
}
