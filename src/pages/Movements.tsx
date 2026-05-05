import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { formatBs } from "@/lib/utils"
import { useEffect, useState } from "react"
import type { Transaction, Category, Payer } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type TransactionWithRefs = Transaction & {
  category?: Pick<Category, "name" | "icon" | "color"> | null
  payer?: Pick<Payer, "name" | "icon"> | null
}

export function Movements({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const [txs, setTxs] = useState<TransactionWithRefs[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from("transactions")
      .select(`
        *,
        category:categories(name, icon, color),
        payer:payers(name, icon)
      `)
      .order("occurred_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setTxs((data as TransactionWithRefs[]) ?? [])
        setLoading(false)
      })
  }, [user, refreshKey])

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">
      <h2 className="text-2xl font-bold tracking-tight mb-6">Movimientos</h2>

      {loading && <p className="text-zinc-500 text-sm">Cargando...</p>}

      {!loading && txs.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-sm">Aún no hay movimientos</p>
          <p className="text-xs mt-1">Tocá el botón + para empezar</p>
        </div>
      )}

      <ul className="space-y-2">
        {txs.map(t => (
          <li key={t.id} className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">
              {t.category?.icon ?? (t.kind === "expense" ? "💸" : "💰")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{t.title}</p>
              <p className="text-xs text-zinc-500">
                {format(new Date(t.occurred_at), "d MMM, HH:mm", { locale: es })}
                {t.payer && ` · ${t.payer.icon} ${t.payer.name}`}
              </p>
            </div>
            <p className={`font-bold tabular-nums ${t.kind === "expense" ? "text-red-400" : "text-emerald-400"}`}>
              {t.kind === "expense" ? "−" : "+"}{formatBs(Number(t.amount_bs))}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
