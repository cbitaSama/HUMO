import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { SettingsModal } from "./Modal"
import { Check } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  email: string
}

function validate(p: string): string | null {
  if (p.length < 8) return "Mínimo 8 caracteres"
  if (!/[A-Z]/.test(p)) return "Debe tener al menos una mayúscula"
  if (!/[0-9]/.test(p)) return "Debe tener al menos un número"
  return null
}

export function PasswordModal({ open, onClose, email }: Props) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrent(""); setNext(""); setConfirm("")
      setError(null); setSuccess(false)
    }
  }, [open])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const v = validate(next)
    if (v) return setError(v)
    if (next !== confirm) return setError("Las contraseñas nuevas no coinciden")

    setSaving(true)
    // Verificar pass actual primero
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: current })
    if (signErr) { setSaving(false); return setError("Contraseña actual incorrecta") }

    const { error: upErr } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (upErr) return setError(upErr.message)

    setSuccess(true)
    setTimeout(() => onClose(), 1400)
  }

  return (
    <SettingsModal open={open} onClose={onClose} title="Cambiar contraseña">
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-8 flex flex-col items-center gap-3"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <Check size={28} className="text-emerald-400" strokeWidth={3} />
          </motion.div>
          <p className="text-sm font-medium text-emerald-400">Contraseña actualizada</p>
        </motion.div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400">Contraseña actual</label>
            <input type="password" required autoFocus value={current} onChange={e => setCurrent(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 outline-none focus:border-zinc-600 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Nueva contraseña</label>
            <input type="password" required value={next} onChange={e => setNext(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 outline-none focus:border-zinc-600 transition-colors"
              placeholder="Mín. 8, una mayúscula, un número" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Repetir nueva</label>
            <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
              className={`mt-1 w-full rounded-xl border bg-zinc-900 text-zinc-50 px-4 py-3 outline-none transition-colors ${
                confirm.length > 0 && confirm !== next
                  ? "border-red-800 focus:border-red-600"
                  : "border-zinc-800 focus:border-zinc-600"
              }`} />
          </div>
          {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}
          <motion.button type="submit" disabled={saving}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
            {saving ? "Actualizando..." : "Cambiar contraseña"}
          </motion.button>
        </form>
      )}
    </SettingsModal>
  )
}
