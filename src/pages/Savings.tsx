import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useSavingsGoals } from "@/hooks/useSavingsGoals"
import { formatBs, cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Plus, Pencil, ArrowDown, ArrowUp, Target, Calendar } from "lucide-react"
import { listVariants, itemVariants } from "@/lib/motion"
import { GoalModal } from "@/components/savings/GoalModal"
import { MovementModal } from "@/components/savings/MovementModal"
import { AnimatedBs } from "@/components/AnimatedNumber"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { SavingsGoal } from "@/lib/types"

type GoalWithTotal = SavingsGoal & {
  total: number
  depositCount: number
}

export function Savings() {
  const { user } = useAuth()
  const { goals } = useSavingsGoals(user?.id)

  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [creatingGoal, setCreatingGoal] = useState(false)
  const [movementOn, setMovementOn] = useState<{
    goal: SavingsGoal
    direction: "deposit" | "withdraw"
    total: number
  } | null>(null)

  // Totales agregados por goal
  const totalsQuery = useQuery({
    queryKey: ["savings_totals", user?.id, goals.map(g => g.id).join(",")],
    queryFn: async () => {
      if (!user || goals.length === 0) return [] as GoalWithTotal[]
      const { data } = await supabase.from("savings_movements")
        .select("goal_id, direction, amount_bs")
      const byGoal = new Map<string, { total: number; depositCount: number }>()
      for (const m of data ?? []) {
        const prev = byGoal.get(m.goal_id) ?? { total: 0, depositCount: 0 }
        if (m.direction === "deposit") {
          prev.total += Number(m.amount_bs)
          prev.depositCount += 1
        } else {
          prev.total -= Number(m.amount_bs)
        }
        byGoal.set(m.goal_id, prev)
      }
      return goals.map(g => ({
        ...g,
        total: Math.max(0, byGoal.get(g.id)?.total ?? 0),
        depositCount: byGoal.get(g.id)?.depositCount ?? 0,
      }))
    },
    enabled: !!user && goals.length > 0,
  })

  const goalsWithTotals = totalsQuery.data ?? goals.map(g => ({ ...g, total: 0, depositCount: 0 }))
  const grandTotal = useMemo(
    () => goalsWithTotals.reduce((s, g) => s + g.total, 0),
    [goalsWithTotals]
  )

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8 space-y-5">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ahorros</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Aparta plata para tus metas</p>
        </div>
        <motion.button
          onClick={() => setCreatingGoal(true)}
          whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
          className="rounded-full bg-zinc-50 text-zinc-950 px-3 py-1.5 text-sm font-medium flex items-center gap-1 shrink-0"
        >
          <Plus size={14} strokeWidth={2.5} /> Nueva
        </motion.button>
      </div>

      {/* Total card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/30 to-zinc-900 p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <p className="text-sm text-zinc-400 mb-1 relative">Total ahorrado</p>
        <p className="text-4xl font-bold tracking-tight text-emerald-400 relative">
          <AnimatedBs value={grandTotal} />
        </p>
        <p className="text-xs text-zinc-500 mt-2 relative">
          Distribuido en {goalsWithTotals.length} {goalsWithTotals.length === 1 ? "meta" : "metas"}
        </p>
      </motion.div>

      {/* Goals list */}
      <motion.div variants={listVariants} initial="initial" animate="animate" className="space-y-3">
        {goalsWithTotals.map(g => {
          const pct = g.target_amount_bs && g.target_amount_bs > 0
            ? Math.min(100, (g.total / Number(g.target_amount_bs)) * 100)
            : null
          const reached = pct !== null && pct >= 100

          return (
            <motion.div
              key={g.id}
              variants={itemVariants}
              whileHover={{ y: -1 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 relative overflow-hidden"
            >
              <div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
                style={{ background: g.color }}
              />

              <div className="flex items-start gap-3 relative">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: g.color + "26", border: `1px solid ${g.color}44` }}
                >
                  {g.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{g.name}</p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: g.color }}>
                        {formatBs(g.total)}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setEditingGoal(g)}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors shrink-0"
                    >
                      <Pencil size={14} />
                    </motion.button>
                  </div>

                  {/* Progress bar si hay meta */}
                  {pct !== null && (
                    <div className="mt-3">
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
                          className="h-full"
                          style={{
                            background: reached
                              ? "linear-gradient(90deg, #22c55e, #facc15)"
                              : g.color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Target size={10} />
                          Meta {formatBs(Number(g.target_amount_bs))}
                        </span>
                        <span className={cn("font-medium tabular-nums", reached && "text-emerald-400")}>
                          {pct.toFixed(0)}% {reached && "✓"}
                        </span>
                      </div>
                    </div>
                  )}

                  {g.target_date && (
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-zinc-500">
                      <Calendar size={10} />
                      <span>Para {format(new Date(g.target_date + "T12:00:00"), "d 'de' MMM yyyy", { locale: es })}</span>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 mt-3">
                    <motion.button
                      onClick={() => setMovementOn({ goal: g, direction: "deposit", total: g.total })}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/25 transition"
                    >
                      <ArrowDown size={13} /> Depositar
                    </motion.button>
                    <motion.button
                      onClick={() => setMovementOn({ goal: g, direction: "withdraw", total: g.total })}
                      disabled={g.total <= 0}
                      whileHover={g.total > 0 ? { y: -1 } : {}}
                      whileTap={g.total > 0 ? { scale: 0.97 } : {}}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/25 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={13} /> Retirar
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {goalsWithTotals.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
          <p>Aún no hay metas de ahorro</p>
          <p className="text-xs mt-1">Tocá "Nueva" para crear la primera</p>
        </div>
      )}

      <GoalModal
        open={!!editingGoal || creatingGoal}
        onClose={() => { setEditingGoal(null); setCreatingGoal(false) }}
        editing={editingGoal}
      />

      {movementOn && (
        <MovementModal
          open={true}
          onClose={() => setMovementOn(null)}
          goal={movementOn.goal}
          currentTotal={movementOn.total}
          defaultDirection={movementOn.direction}
        />
      )}
    </div>
  )
}
