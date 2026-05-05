import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { formatBs } from "@/lib/utils"
import { CategoryDonut } from "@/components/charts/CategoryDonut"
import { useEffect, useMemo, useState } from "react"
import { Flame, TrendingUp, TrendingDown } from "lucide-react"

type TxRow = {
  kind: "expense" | "income"
  amount_bs: number
  category_id: string | null
  payer_id: string | null
  category?: { name: string; icon: string; color: string } | null
  payer?: { name: string; icon: string; is_self: boolean } | null
}

export function Dashboard({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const [rows, setRows] = useState<TxRow[]>([])
  const [openDebts, setOpenDebts] = useState({ owedToMe: 0, iOwe: 0 })
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
      supabase
        .from("transactions")
        .select(`
          kind, amount_bs, category_id, payer_id,
          category:categories(name, icon, color),
          payer:payers(name, icon, is_self)
        `)
        .gte("occurred_at", monthStart)
        .lt("occurred_at", monthEnd),
      supabase
        .from("debts")
        .select("direction, amount_bs")
        .eq("status", "open"),
    ]).then(([txRes, debtRes]) => {
      setRows((txRes.data as unknown as TxRow[]) ?? [])
      const debts = debtRes.data ?? []
      setOpenDebts({
        owedToMe: debts.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + Number(d.amount_bs), 0),
        iOwe: debts.filter(d => d.direction === "i_owe").reduce((s, d) => s + Number(d.amount_bs), 0),
      })
      setLoading(false)
    })
  }, [user, refreshKey])

  const stats = useMemo(() => {
    const expenses = rows.filter(r => r.kind === "expense")
    const incomes = rows.filter(r => r.kind === "income")

    // Gastos personales = solo los que pagué yo
    const myExpenses = expenses.filter(r => r.payer?.is_self === true)
    // Gastos de otros = los que pagaron por mí
    const othersExpenses = expenses.filter(r => r.payer && !r.payer.is_self)

    const myExpense = myExpenses.reduce((s, r) => s + Number(r.amount_bs), 0)
    const othersExpense = othersExpenses.reduce((s, r) => s + Number(r.amount_bs), 0)
    const income = incomes.reduce((s, r) => s + Number(r.amount_bs), 0)

    // Humo solo cuenta mis gastos chicos, no de otros
    const humoTxs = myExpenses.filter(r => Number(r.amount_bs) < humoThreshold)
    const humoTotal = humoTxs.reduce((s, r) => s + Number(r.amount_bs), 0)

    // Categorías solo de MIS gastos
    const catMap = new Map<string, { name: string; icon: string; color: string; value: number }>()
    for (const r of myExpenses) {
      const key = r.category_id ?? "none"
      const name = r.category?.name ?? "Sin categoría"
      const icon = r.category?.icon ?? "📦"
      const color = r.category?.color ?? "#52525b"
      const prev = catMap.get(key) ?? { name, icon, color, value: 0 }
      prev.value += Number(r.amount_bs)
      catMap.set(key, prev)
    }
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.value - a.value)

    // Pagado por otros (papá/mamá/etc)
    const payerMap = new Map<string, { name: string; icon: string; value: number }>()
    for (const r of othersExpenses) {
      const key = r.payer_id ?? "none"
      const prev = payerMap.get(key) ?? { name: r.payer!.name, icon: r.payer!.icon, value: 0 }
      prev.value += Number(r.amount_bs)
      payerMap.set(key, prev)
    }
    const byOthers = Array.from(payerMap.values()).sort((a, b) => b.value - a.value)

    return {
      income,
      myExpense,
      othersExpense,
      balance: income - myExpense,
      humoTotal,
      humoCount: humoTxs.length,
      byCategory,
      byOthers,
    }
  }, [rows, humoThreshold])

  const monthName = new Date().toLocaleString("es-BO", { month: "long" })

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8 space-y-4">

      <div className="mb-2">
        <p className="text-sm text-zinc-500">Hola,</p>
        <h2 className="text-3xl font-bold tracking-tight">{firstName} 👋</h2>
      </div>

      {/* Balance principal — solo cuenta MI plata */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <p className="text-sm text-zinc-500 mb-2 capitalize">Tu balance · {monthName}</p>
        <p className={`text-5xl font-bold tracking-tight ${stats.balance < 0 ? "text-red-400" : ""}`}>
          {loading ? "..." : formatBs(stats.balance)}
        </p>
        <p className="text-[11px] text-zinc-600 mt-2">
          Solo cuenta lo que pagaste vos
        </p>
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-emerald-400" />
            <p className="text-xs text-zinc-500">Ingresos</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{loading ? "..." : formatBs(stats.income)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-red-400" />
            <p className="text-xs text-zinc-500">Tus gastos</p>
          </div>
          <p className="text-2xl font-bold text-red-400 tabular-nums">{loading ? "..." : formatBs(stats.myExpense)}</p>
        </div>
      </div>

      {/* Deudas abiertas si las hay */}
      {(openDebts.owedToMe > 0 || openDebts.iOwe > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {openDebts.owedToMe > 0 && (
            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Te deben</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatBs(openDebts.owedToMe)}</p>
            </div>
          )}
          {openDebts.iOwe > 0 && (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Vos debés</p>
              <p className="text-lg font-bold text-red-400 tabular-nums">{formatBs(openDebts.iOwe)}</p>
            </div>
          )}
        </div>
      )}

      {/* Grid responsive */}
      <div className="grid md:grid-cols-2 gap-4">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-medium text-zinc-300 mb-1">¿En qué se va tu plata?</p>
          <p className="text-xs text-zinc-500 mb-4">Solo lo que pagaste vos · este mes</p>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">Cargando...</div>
          ) : (
            <>
              <CategoryDonut data={stats.byCategory} />
              {stats.byCategory.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {stats.byCategory.slice(0, 5).map((c, i) => {
                    const pct = stats.myExpense > 0 ? (c.value / stats.myExpense) * 100 : 0
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                        <span className="flex-1 truncate">{c.icon} {c.name}</span>
                        <span className="text-zinc-500 text-xs tabular-nums">{pct.toFixed(0)}%</span>
                        <span className="font-medium tabular-nums">{formatBs(c.value)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">

          <div className="rounded-2xl border border-orange-900/40 bg-gradient-to-br from-orange-950/30 to-zinc-900 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={18} className="text-orange-400" />
              <p className="text-sm font-medium text-zinc-200">Humómetro</p>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Tus gastos chicos &lt; {formatBs(humoThreshold)}
            </p>
            <p className="text-3xl font-bold tracking-tight text-orange-400">
              {loading ? "..." : formatBs(stats.humoTotal)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.humoCount} {stats.humoCount === 1 ? "compra chiquita" : "compras chiquitas"} este mes
            </p>
            {stats.myExpense > 0 && (
              <div className="mt-4">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.humoTotal / stats.myExpense) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {((stats.humoTotal / stats.myExpense) * 100).toFixed(0)}% de tus gastos
                </p>
              </div>
            )}
          </div>

          {stats.byOthers.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm font-medium text-zinc-300 mb-1">Gastaron en mí</p>
              <p className="text-xs text-zinc-500 mb-4">
                {formatBs(stats.othersExpense)} en total · este mes
              </p>
              <ul className="space-y-3">
                {stats.byOthers.map((p, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <span className="flex-1 font-medium">{p.name}</span>
                    <span className="font-bold tabular-nums">{formatBs(p.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
