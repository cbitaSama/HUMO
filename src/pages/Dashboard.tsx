import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { formatBs } from "@/lib/utils"
import { CategoryDonut } from "@/components/charts/CategoryDonut"
import { AnimatedBs } from "@/components/AnimatedNumber"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Flame, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"

type TxRow = {
  kind: "expense" | "income"
  amount_bs: number
  category_id: string | null
  payer_id: string | null
  category?: { name: string; icon: string; color: string; is_savings: boolean } | null
  payer?: { name: string; icon: string; is_self: boolean } | null
}

export function Dashboard({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const [rows, setRows] = useState<TxRow[]>([])
  const [openDebts, setOpenDebts] = useState({ owedToMe: 0, iOwe: 0 })
  const [savingsTotal, setSavingsTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const firstName = profile?.display_name?.split(" ")[0] ?? ""
  const humoThreshold = Number(profile?.humo_threshold_bs ?? 20)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    Promise.all([
      supabase.from("transactions").select(`
        kind, amount_bs, category_id, payer_id,
        category:categories(name, icon, color, is_savings),
        payer:payers(name, icon, is_self)
      `).gte("occurred_at", monthStart).lt("occurred_at", monthEnd),
      supabase.from("debts").select("direction, amount_bs").eq("status", "open"),
      supabase.from("savings_movements").select("direction, amount_bs"),
    ]).then(([txRes, debtRes, svRes]) => {
      setRows((txRes.data as unknown as TxRow[]) ?? [])
      const debts = debtRes.data ?? []
      setOpenDebts({
        owedToMe: debts.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + Number(d.amount_bs), 0),
        iOwe:     debts.filter(d => d.direction === "i_owe").reduce((s, d) => s + Number(d.amount_bs), 0),
      })
      const sv = svRes.data ?? []
      const total = sv.reduce((s, m) => s + (m.direction === "deposit" ? Number(m.amount_bs) : -Number(m.amount_bs)), 0)
      setSavingsTotal(Math.max(0, total))
      setLoading(false)
    })
  }, [user, refreshKey])

  const stats = useMemo(() => {
    const expenses = rows.filter(r => r.kind === "expense")
    const incomes = rows.filter(r => r.kind === "income")
    const myExpenses = expenses.filter(r => r.payer?.is_self === true)
    const othersExpenses = expenses.filter(r => r.payer && !r.payer.is_self)

    const myExpense = myExpenses.reduce((s, r) => s + Number(r.amount_bs), 0)
    const othersExpense = othersExpenses.reduce((s, r) => s + Number(r.amount_bs), 0)
    const income = incomes.reduce((s, r) => s + Number(r.amount_bs), 0)

    // Humómetro: excluye savings
    const humoTxs = myExpenses.filter(r =>
      Number(r.amount_bs) < humoThreshold &&
      !r.category?.is_savings
    )
    const humoTotal = humoTxs.reduce((s, r) => s + Number(r.amount_bs), 0)

    // Categorías para donut: excluye savings (que son apartado, no gasto real)
    const realExpenses = myExpenses.filter(r => !r.category?.is_savings)
    const realExpenseTotal = realExpenses.reduce((s, r) => s + Number(r.amount_bs), 0)

    const catMap = new Map<string, { name: string; icon: string; color: string; value: number }>()
    for (const r of realExpenses) {
      const key = r.category_id ?? "none"
      const name = r.category?.name ?? "Sin categoría"
      const icon = r.category?.icon ?? "📦"
      const color = r.category?.color ?? "#52525b"
      const prev = catMap.get(key) ?? { name, icon, color, value: 0 }
      prev.value += Number(r.amount_bs)
      catMap.set(key, prev)
    }
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.value - a.value)

    const payerMap = new Map<string, { name: string; icon: string; value: number }>()
    for (const r of othersExpenses) {
      const key = r.payer_id ?? "none"
      const prev = payerMap.get(key) ?? { name: r.payer!.name, icon: r.payer!.icon, value: 0 }
      prev.value += Number(r.amount_bs)
      payerMap.set(key, prev)
    }
    const byOthers = Array.from(payerMap.values()).sort((a, b) => b.value - a.value)

    return {
      income, myExpense, othersExpense,
      balance: income - myExpense, // ahorro YA descuenta porque es expense
      humoTotal, humoCount: humoTxs.length,
      realExpenseTotal,
      byCategory, byOthers,
    }
  }, [rows, humoThreshold])

  const monthName = new Date().toLocaleString("es-BO", { month: "long" })

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8 space-y-4">

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="mb-2"
      >
        <p className="text-sm text-zinc-500">Hola,</p>
        <h2 className="text-3xl font-bold tracking-tight">{firstName} 👋</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
        className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 md:p-7 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
             style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")" }} />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-zinc-50/[0.02] blur-3xl pointer-events-none" />
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-[0.12em] mb-2.5 capitalize relative">Disponible · {monthName}</p>
        <p className={`text-[2.75rem] md:text-5xl font-bold tracking-tight relative leading-none tabular-nums ${stats.balance < 0 ? "text-red-400" : "text-zinc-50"}`}>
          {loading ? <span className="inline-block h-12 w-40 rounded-lg shimmer bg-zinc-800/40" /> : <AnimatedBs value={stats.balance} />}
        </p>
        <p className="text-[11px] text-zinc-600 mt-3 relative">Ahorros ya están apartados</p>
      </motion.div>

      {/* Stats: Ingresos, Gastos, Ahorrado */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-3 gap-2.5 md:gap-3"
      >
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-3 md:p-4 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp size={11} className="text-emerald-400 shrink-0" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">Ingresos</p>
          </div>
          <p className="text-[15px] md:text-xl font-bold text-emerald-400 tabular-nums truncate">
            {loading ? <span className="inline-block h-5 w-16 rounded shimmer bg-zinc-800/50" /> : <AnimatedBs value={stats.income} />}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-3 md:p-4 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingDown size={11} className="text-red-400 shrink-0" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">Gastos</p>
          </div>
          <p className="text-[15px] md:text-xl font-bold text-red-400 tabular-nums truncate">
            {loading ? <span className="inline-block h-5 w-16 rounded shimmer bg-zinc-800/50" /> : <AnimatedBs value={stats.realExpenseTotal} />}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-3 md:p-4 hover:border-emerald-800/60 transition-colors">
          <div className="flex items-center gap-1 mb-1.5">
            <PiggyBank size={11} className="text-emerald-300 shrink-0" />
            <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider truncate">Ahorrado</p>
          </div>
          <p className="text-[15px] md:text-xl font-bold text-emerald-300 tabular-nums truncate">
            {loading ? <span className="inline-block h-5 w-16 rounded shimmer bg-emerald-900/30" /> : <AnimatedBs value={savingsTotal} />}
          </p>
        </div>
      </motion.div>

      {(openDebts.owedToMe > 0 || openDebts.iOwe > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          {openDebts.owedToMe > 0 && (
            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Te deben</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">
                <AnimatedBs value={openDebts.owedToMe} />
              </p>
            </div>
          )}
          {openDebts.iOwe > 0 && (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Vos debés</p>
              <p className="text-lg font-bold text-red-400 tabular-nums">
                <AnimatedBs value={openDebts.iOwe} />
              </p>
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid md:grid-cols-2 gap-4"
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors">
          <p className="text-sm font-medium text-zinc-300 mb-1">¿En qué se va tu plata?</p>
          <p className="text-xs text-zinc-500 mb-4">Sin contar ahorros · este mes</p>
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-32 h-32 rounded-full shimmer bg-zinc-800/40" />
              <div className="space-y-2 w-full mt-2">
                {[1,2,3].map(i => <div key={i} className="h-3 rounded shimmer bg-zinc-800/40" />)}
              </div>
            </div>
          ) : stats.byCategory.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl opacity-50">🌱</span>
              <p className="text-sm text-zinc-400 font-medium">Sin gastos este mes</p>
              <p className="text-xs text-zinc-600 max-w-[14rem]">Cuando registres gastos vas a ver acá en qué se va tu plata</p>
            </div>
          ) : (
            <>
              <CategoryDonut data={stats.byCategory} />
              <ul className="mt-4 space-y-2">
                {stats.byCategory.slice(0, 5).map((c, i) => {
                  const pct = stats.realExpenseTotal > 0 ? (c.value / stats.realExpenseTotal) * 100 : 0
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="flex-1 truncate">{c.icon} {c.name}</span>
                      <span className="text-zinc-500 text-xs tabular-nums">{pct.toFixed(0)}%</span>
                      <span className="font-medium tabular-nums">{formatBs(c.value)}</span>
                    </motion.li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="rounded-2xl border border-orange-900/40 bg-gradient-to-br from-orange-950/30 to-zinc-900 p-6 relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-1 relative">
              <Flame size={18} className="text-orange-400" />
              <p className="text-sm font-medium text-zinc-200">Humómetro</p>
            </div>
            <p className="text-xs text-zinc-500 mb-3 relative">
              Tus gastos chicos &lt; {formatBs(humoThreshold)}
            </p>
            <p className="text-3xl font-bold tracking-tight text-orange-400 relative tabular-nums">
              {loading ? <span className="inline-block h-8 w-24 rounded shimmer bg-orange-900/30" /> : <AnimatedBs value={stats.humoTotal} />}
            </p>
            <p className="text-xs text-zinc-500 mt-1 relative">
              {stats.humoCount} {stats.humoCount === 1 ? "compra chiquita" : "compras chiquitas"} este mes
            </p>
            {stats.realExpenseTotal > 0 && (
              <div className="mt-4 relative">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stats.humoTotal / stats.realExpenseTotal) * 100)}%` }}
                    transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1], delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {((stats.humoTotal / stats.realExpenseTotal) * 100).toFixed(0)}% de tus gastos
                </p>
              </div>
            )}
          </motion.div>

          {stats.byOthers.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm font-medium text-zinc-300 mb-1">Gastaron en mí</p>
              <p className="text-xs text-zinc-500 mb-4">
                <AnimatedBs value={stats.othersExpense} /> en total · este mes
              </p>
              <ul className="space-y-3">
                {stats.byOthers.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="flex-1 font-medium">{p.name}</span>
                    <span className="font-bold tabular-nums">{formatBs(p.value)}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
