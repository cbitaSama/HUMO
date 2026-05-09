import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Check, Loader2 } from "lucide-react"
import { SettingsModal } from "./Modal"

type Counts = { transactions: number; recurring: number; debts: number; groups: number }

type Props = {
  open: boolean
  onClose: () => void
  email: string
  onReset: () => void
}

export function ResetAccountModal({ open, onClose, email, onReset }: Props) {
  const qc = useQueryClient()
  const [confirmInput, setConfirmInput] = useState("")
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setConfirmInput(""); setError(null); setDone(false); setResetting(false)
    setLoadingCounts(true)
    Promise.all([
      supabase.from("transactions").select("id", { count: "exact", head: true }),
      supabase.from("recurring_templates").select("id", { count: "exact", head: true }),
      supabase.from("debts").select("id", { count: "exact", head: true }),
      supabase.from("debt_groups").select("id", { count: "exact", head: true }),
    ]).then(([t, r, d, g]) => {
      setCounts({
        transactions: t.count ?? 0, recurring: r.count ?? 0,
        debts: d.count ?? 0, groups: g.count ?? 0,
      })
      setLoadingCounts(false)
    })
  }, [open])

  const matches = confirmInput.trim().toLowerCase() === email.toLowerCase()

  async function execute() {
    setResetting(true); setError(null)
    const { error: err } = await supabase.rpc("reset_user_data", { confirm_email: confirmInput.trim() })
    if (err) { setResetting(false); return setError(err.message) }
    await qc.invalidateQueries()
    setResetting(false)
    setDone(true)
    setTimeout(() => { onReset(); onClose() }, 1800)
  }

  return (
    <SettingsModal open={open} onClose={onClose} title="Restablecer cuenta">
      {done ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 flex flex-col items-center gap-3">
          <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check size={28} className="text-emerald-400" strokeWidth={3} />
          </motion.div>
          <p className="text-sm font-medium text-emerald-400">Cuenta restablecida</p>
          <p className="text-xs text-zinc-500">Empezás desde cero</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-900/60">
            <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-red-200">
              Esta acción <span className="font-bold">no se puede deshacer</span>. Se borran todos tus datos y volvés a categorías y pagadores por defecto. Tu cuenta de email se mantiene activa.
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Esto se va a borrar</p>
            {loadingCounts || !counts ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg shimmer bg-zinc-900/60" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-2xl font-bold tabular-nums">{counts.transactions}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Movimientos</p>
                </div>
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-2xl font-bold tabular-nums">{counts.recurring}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Recurrentes</p>
                </div>
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-2xl font-bold tabular-nums">{counts.debts}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Préstamos</p>
                </div>
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-2xl font-bold tabular-nums">{counts.groups}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Grupos</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Para confirmar, escribí tu email:</label>
            <p className="text-[11px] text-zinc-600 mt-0.5 mb-2">{email}</p>
            <input type="email" value={confirmInput} onChange={e => setConfirmInput(e.target.value)}
              className={`w-full rounded-xl border bg-zinc-900 text-zinc-50 px-4 py-3 text-sm outline-none transition-colors ${
                matches ? "border-emerald-500/40 focus:border-emerald-500"
                        : confirmInput.length > 0 ? "border-amber-800 focus:border-amber-600"
                        : "border-zinc-800 focus:border-zinc-600"
              }`}
              placeholder="Tu email exacto" autoComplete="off" autoCapitalize="off" />
          </div>

          {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.98 }}
              className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition">
              Cancelar
            </motion.button>
            <motion.button onClick={execute} disabled={!matches || resetting}
              whileHover={matches ? { y: -1 } : {}}
              whileTap={matches ? { scale: 0.98 } : {}}
              className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {resetting && <Loader2 size={14} className="animate-spin" />}
              {resetting ? "Borrando..." : "Restablecer todo"}
            </motion.button>
          </div>
        </div>
      )}
    </SettingsModal>
  )
}
