import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn, formatBs } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import type { Transaction, Category, Payer } from "@/lib/types"
import { format, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { Flame, Lock, PiggyBank } from "lucide-react"
import { motion } from "framer-motion"
import { listVariants, itemVariants } from "@/lib/motion"
import { QuickAddModal } from "@/components/quick-add/QuickAddModal"
import { loadLockedTxIds } from "@/lib/locks"

type CategoryWithSavings = Category & { is_savings: boolean }

type TransactionWithRefs = Transaction & {
  category?: Pick<CategoryWithSavings, "name" | "icon" | "color" | "is_savings"> | null
  payer?: Pick<Payer, "name" | "icon"> | null
}

type Filter = "all" | "expense" | "income" | "humo" | "savings"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",     label: "Todos" },
  { id: "expense", label: "Gastos" },
  { id: "income",  label: "Ingresos" },
  { id: "humo",    label: "Humo 🔥" },
  { id: "savings", label: "Ahorros 🏦" },
]

export function Movements({ refreshKey: parentKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const [txs, setTxs] = useState<TransactionWithRefs[]>([])
  const [monthRealExpense, setMonthRealExpense] = useState(0)
  const [humoThreshold, setHumoThreshold] = useState(20)
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [editing, setEditing] = useState<TransactionWithRefs | null>(null)
  const [editingLocked, setEditingLocked] = useState(false)
  const [localKey, setLocalKey] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    Promise.all([
      supabase.from("transactions").select(`
        *, category:categories(name, icon, color, is_savings), payer:payers(name, icon)
      `).order("occurred_at", { ascending: false }).limit(200),
      supabase.from("transactions").select(`amount_bs, category:categories(is_savings)`)
        .eq("kind", "expense")
        .gte("occurred_at", monthStart).lt("occurred_at", monthEnd),
      supabase.from("profiles").select("humo_threshold_bs").eq("id", user.id).single(),
      loadLockedTxIds(),
    ]).then(([txsRes, monthRes, profileRes, locks]) => {
      setTxs((txsRes.data as TransactionWithRefs[]) ?? [])
      const monthData = (monthRes.data as any[]) ?? []
      const realExp = monthData
        .filter(r => !r.category?.is_savings)
        .reduce((s, r) => s + Number(r.amount_bs), 0)
      setMonthRealExpense(realExp)
      if (profileRes.data) setHumoThreshold(Number(profileRes.data.humo_threshold_bs))
      setLockedIds(locks)
      setLoading(false)
    })
  }, [user, parentKey, localKey])

  const filtered = useMemo(() => {
    switch (filter) {
      case "expense": return txs.filter(t => t.kind === "expense")
      case "income":  return txs.filter(t => t.kind === "income")
      case "humo":    return txs.filter(t =>
        t.kind === "expense" && Number(t.amount_bs) < humoThreshold && !t.category?.is_savings
      )
      case "savings": return txs.filter(t => t.category?.is_savings === true)
      default:        return txs
    }
  }, [txs, filter, humoThreshold])

  const grouped = useMemo(() => {
    const map = new Map<string, TransactionWithRefs[]>()
    for (const t of filtered) {
      const day = format(new Date(t.occurred_at), "yyyy-MM-dd")
      const arr = map.get(day) ?? []
      arr.push(t)
      map.set(day, arr)
    }
    return Array.from(map.entries()).map(([day, items]) => ({
      day: new Date(day + "T12:00:00"), items,
    }))
  }, [filtered])

  function dayLabel(d: Date) {
    if (isToday(d)) return "Hoy"
    if (isYesterday(d)) return "Ayer"
    return format(d, "EEEE d 'de' MMMM", { locale: es })
  }

  function isLocked(t: TransactionWithRefs): boolean {
    return !!t.recurring_template_id || lockedIds.has(t.id)
  }

  function openTx(t: TransactionWithRefs) {
    setEditingLocked(isLocked(t))
    setEditing(t)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Movimientos</h2>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map(f => (
          <motion.button
            key={f.id}
            onClick={() => setFilter(f.id)}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-all shrink-0",
              filter === f.id
                ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
            )}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 rounded-xl shimmer bg-zinc-900/60 border border-zinc-800/50" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <span className="text-4xl opacity-50">
            {filter === "humo" ? "🔥" : filter === "savings" ? "🐷" : filter === "income" ? "💰" : filter === "expense" ? "💸" : "✨"}
          </span>
          <p className="text-sm font-medium text-zinc-300">
            {filter === "all" ? "Aún no hay movimientos" : "Sin resultados"}
          </p>
          {filter === "all" && <p className="text-xs text-zinc-500 max-w-[16rem]">Tocá el botón + para registrar tu primer gasto o ingreso</p>}
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(({ day, items }) => (
          <div key={day.toISOString()}>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 capitalize">
              {dayLabel(day)}
            </p>
            <motion.ul
              variants={listVariants}
              initial="initial"
              animate="animate"
              className="space-y-2"
            >
              {items.map(t => {
                const locked = isLocked(t)
                const isSavings = t.category?.is_savings === true
                const isHumo = t.kind === "expense" && Number(t.amount_bs) < humoThreshold && !isSavings
                const pctOfMonth = monthRealExpense > 0 && t.kind === "expense" && !isSavings
                  ? (Number(t.amount_bs) / monthRealExpense) * 100
                  : 0

                return (
                  <motion.li
                    key={t.id}
                    variants={itemVariants}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => openTx(t)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">
                      {t.category?.icon ?? (t.kind === "expense" ? "💸" : "💰")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{t.title}</p>
                        {isSavings && <PiggyBank size={11} className="text-emerald-400 shrink-0" />}
                        {isHumo && <Flame size={12} className="text-orange-400 shrink-0" />}
                        {locked && <Lock size={10} className="text-purple-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {format(new Date(t.occurred_at), "HH:mm")}
                        {t.payer && ` · ${t.payer.icon} ${t.payer.name}`}
                        {t.category && ` · ${t.category.name}`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-bold tabular-nums ${t.kind === "expense" ? "text-red-400" : "text-emerald-400"}`}>
                        {t.kind === "expense" ? "−" : "+"}{formatBs(Number(t.amount_bs))}
                      </p>
                      {pctOfMonth >= 1 && (
                        <p className="text-[10px] text-zinc-600 mt-0.5 tabular-nums">
                          {pctOfMonth.toFixed(1)}% del mes
                        </p>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </motion.ul>
          </div>
        ))}
      </div>

      <QuickAddModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => setLocalKey(k => k + 1)}
        editing={editing}
        forceLocked={editingLocked}
      />
    </div>
  )
}
