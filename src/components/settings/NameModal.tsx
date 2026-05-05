import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useQueryClient } from "@tanstack/react-query"
import { SettingsModal } from "./Modal"

type Props = {
  open: boolean
  onClose: () => void
  current: string
  userId: string
  onSaved: () => void
}

export function NameModal({ open, onClose, current, userId, onSaved }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (open) { setName(current); setError(null) } }, [open, current])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Falta el nombre")
    setSaving(true)
    const { error: err } = await supabase.from("profiles").update({
      display_name: name.trim()
    }).eq("id", userId)
    if (err) { setSaving(false); return setError(err.message) }
    await qc.invalidateQueries({ queryKey: ["profile"] })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <SettingsModal open={open} onClose={onClose} title="Cambiar nombre">
      <form onSubmit={save} className="space-y-4">
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
          placeholder="Tu nombre completo"
        />
        {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}
        <motion.button type="submit" disabled={saving}
          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar"}
        </motion.button>
      </form>
    </SettingsModal>
  )
}
