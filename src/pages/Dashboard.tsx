import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { formatBs } from "@/lib/utils"
import { useEffect, useState } from "react"

type Stats = {
  income: number
  expense: number
  balance: number
}

export function Dashboard({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const [stats, setStats] = useState<Stats>({ income: 0, expense: 0, balance: 0 })
  const [loading, setLoading] = useState(true)

  const firstName = profile?.display_name?.split(" ")[0] ?? ""

  useEffect(() => {
    if (!user) return
    setLoading(true)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    supabase
      .from("transactions")
      .select("kind, amount_bs")
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd)
      .then(({ data }) => {
        if (!data) return
        const income = data.filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount_bs), 0)
        const expense = data.filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount_bs), 0)
        setStats({ income, expense, balance: income - expense })
        setLoading(false)
      })
  }, [user, refreshKey])

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">
      <div className="mb-8">
        <p className="text-sm text-zinc-500">Hola,</p>
        <h2 className="text-3xl font-bold tracking-tight">{firstName} 👋</h2>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 mb-4">
        <p className="text-sm text-zinc-500 mb-2">Balance del mes</p>
        <p className={`text-5xl font-bold tracking-tight ${stats.balance < 0 ? "text-red-400" : ""}`}>
          {loading ? "..." : formatBs(stats.balance)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-1">Ingresos</p>
          <p className="text-2xl font-bold text-emerald-400">{loading ? "..." : formatBs(stats.income)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-1">Gastos</p>
          <p className="text-2xl font-bold text-red-400">{loading ? "..." : formatBs(stats.expense)}</p>
        </div>
      </div>
    </div>
  )
}
