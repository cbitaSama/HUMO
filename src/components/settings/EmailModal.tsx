import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { SettingsModal } from "./Modal"
import { Mail } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  current: string
}

export function EmailModal({ open, onClose, current }: Props) {
  const [password, setPassword] = useState("")
  const [next, setNext] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) { setPassword(""); setNext(""); setError(null); setSent(false) }
  }, [open])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!next || !next.includes("@")) return setError("Email inválido")
    if (next.toLowerCase() === current.toLowerCase()) return setError("Es tu email actual")

    setSaving(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: current, password })
    if (signErr) { setSaving(false); return setError("Contraseña incorrecta") }

    const { error: upErr } = await supabase.auth.updateUser({ email: next })
    setSaving(false)
    if (upErr) return setError(upErr.message)

    setSent(true)
  }

  return (
    <SettingsModal open={open} onClose={onClose} title="Cambiar email">
      {sent ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-6 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
            <Mail size={26} className="text-blue-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium">Confirmá desde tu email</p>
            <p className="text-xs text-zinc-500">
              Te mandamos un mail a <span className="text-zinc-300">{next}</span>.<br />
              Tu email actual va a quedar hasta que confirmes.
            </p>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm">
            <p className="text-xs text-zinc-500">Email actual</p>
            <p className="text-zinc-200 truncate">{current}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Nuevo email</label>
            <input type="email" required autoFocus value={next} onChange={e => setNext(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 outline-none focus:border-zinc-600 transition-colors"
              placeholder="nuevo@email.com" autoComplete="email" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Contraseña actual (verificación)</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 outline-none focus:border-zinc-600 transition-colors"
              autoComplete="current-password" />
          </div>
          {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}
          <motion.button type="submit" disabled={saving}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
            {saving ? "Enviando..." : "Cambiar email"}
          </motion.button>
        </form>
      )}
    </SettingsModal>
  )
}
