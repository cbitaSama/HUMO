import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { formatBs } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import type { Transaction, Category, Payer } from "@/lib/types"
import { format, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, Pencil, Lock } from "lucide-react"
import { motion } from "framer-motion"
import { listVariants, itemVariants } from "@/lib/motion"
import { QuickAddModal } from "@/components/quick-add/QuickAddModal"
import { PayerModal } from "@/components/payers/PayerModal"
import { loadLockedTxIds } from "@/lib/locks"

type TxWithRefs = Transaction & {
  category?: Pick<Category, "name" | "icon" | "color"> | null
}

type Props = {
  payer: Payer
  onBack: () => void
  onPayerUpdated: () => void
}

export function PayerDetail({ payer, onBack, onPayerUpdated }: Props) {
  const { user } = useAuth()
  const [txs, setTxs] = useState<TxWithRefs[]>([])
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [editingTx, setEditingTx] = useState<TxWithRefs | null>(null)
  const [editingLocked, setEditingLocked] = useState(false)
  const [editingPayer, setEditingPayer] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from("transactions")
        .select(`*, category:categories(name, icon, color)`)
        .eq("payer_id", payer.id)
        .order("occurred_at", { ascending: false })
        .limit(200),
      loadLockedTxIds(),
    ]).then(([txRes, locks]) => {
      setTxs((txRes.data as TxWithRefs[]) ?? [])
      setLockedIds(locks)
      setLoading(false)
    })
  }, [user, payer.id, refreshKey])

  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const expenses = txs.filter(t => t.kind === "expense")
    const all = expenses.reduce((s, t) => s + Number(t.amount_bs), 0)
    const month = expenses.filter(t => new Date(t.occurred_at) >= monthStart).reduce((s, t) => s + Number(t.amount_bs), 0)

    const cats = new Map<string, { name: string; icon: string; total: number }>()
    for (const t of expenses) {
      const key = t.category_id ?? "none"
      const name = t.category?.name ?? "Sin categoría"
      const icon = t.category?.icon ?? "📦"
      const prev = cats.get(key) ?? { name, icon, total: 0 }
      prev.total += Number(t.amount_bs)
      cats.set(key, prev)
    }
    const topCats = Array.from(cats.values()).sort((a, b) => b.total - a.total).slice(0, 5)
    return { all, month, count: expenses.length, topCats }
  }, [txs])

  const grouped = useMemo(() => {
    const map = new Map<string, TxWithRefs[]>()
    for (const t of txs) {
      const day = format(new Date(t.occurred_at), "yyyy-MM-dd")
      const arr = map.get(day) ?? []
      arr.push(t)
      map.set(day, arr)
    }
    return Array.from(map.entries()).map(([day, items]) => ({
      day: new Date(day + "T12:00:00"), items,
    }))
  }, [txs])

  function dayLabel(d: Date) {
    if (isToday(d)) return "Hoy"
    if (isYesterday(d)) return "Ayer"
    return format(d, "EEEE d 'de' MMMM", { locale: es })
  }

  function isLocked(t: TxWithRefs): boolean {
    return !!t.recurring_template_id || lockedIds.has(t.id)
  }

  function openTx(t: TxWithRefs) {
    setEditingLocked(isLocked(t))
    setEditingTx(t)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">
      <motion.button
        onClick={onBack}
        whileTap={{ scale: 0.95 }}
        whileHover={{ x: -2 }}
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 mb-6 transition-colors"
      >
        <ChevronLeft size={16} /> Pagadores
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-6 mb-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${payer.color}26 0%, #18181b 100%)` }}
      >
        <motion.button
          onClick={() => setEditingPayer(true)}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
        >
          <Pencil size={14} />
        </motion.button>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ background: payer.color + "33", border: `2px solid ${payer.color}` }}
          >
            {payer.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{payer.name}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {stats.count} {stats.count === 1 ? "movimiento" : "movimientos"} en total
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-1">Este mes</p>
          <p className="text-2xl font-bold tabular-nums">{loading ? "..." : formatBs(stats.month)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-1">Total histórico</p>
          <p className="text-2xl font-bold tabular-nums">{loading ? "..." : formatBs(stats.all)}</p>
        </div>
      </div>

      {stats.topCats.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-6">
          <p className="text-sm font-medium text-zinc-300 mb-3">Top categorías</p>
          <ul className="space-y-2">
            {stats.topCats.map((c, i) => {
              const pct = stats.all > 0 ? (c.total / stats.all) * 100 : 0
              return (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{c.icon}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-zinc-500 text-xs tabular-nums">{pct.toFixed(0)}%</span>
                  <span className="font-medium tabular-nums">{formatBs(c.total)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-sm font-medium text-zinc-400 mb-3">Todos los movimientos</p>

      {loading && <p className="text-zinc-500 text-sm">Cargando...</p>}
      {!loading && txs.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
          Sin movimientos aún
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(({ day, items }) => (
          <div key={day.toISOString()}>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 capitalize">
              {dayLabel(day)}
            </p>
            <motion.ul variants={listVariants} initial="initial" animate="animate" className="space-y-2">
              {items.map(t => {
                const locked = isLocked(t)
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
                        {locked && <Lock size={10} className="text-purple-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(t.occurred_at), "HH:mm")}
                        {t.category && ` · ${t.category.name}`}
                      </p>
                    </div>
                    <p className={`font-bold tabular-nums shrink-0 ${t.kind === "expense" ? "text-red-400" : "text-emerald-400"}`}>
                      {t.kind === "expense" ? "−" : "+"}{formatBs(Number(t.amount_bs))}
                    </p>
                  </motion.li>
                )
              })}
            </motion.ul>
          </div>
        ))}
      </div>

      <QuickAddModal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={() => setRefreshKey(k => k + 1)}
        editing={editingTx}
        forceLocked={editingLocked}
      />

      <PayerModal
        open={editingPayer}
        onClose={() => setEditingPayer(false)}
        onSaved={() => { setRefreshKey(k => k + 1); onPayerUpdated() }}
        editing={payer}
      />
    </div>
  )
}
