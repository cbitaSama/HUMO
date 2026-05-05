import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn, formatBs } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import type { Debt } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Check, RotateCcw } from "lucide-react"
import { DebtModal } from "@/components/debts/DebtModal"

type Filter = "open" | "settled" | "all"
type DirFilter = "all" | "owed_to_me" | "i_owe"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "open",    label: "Abiertas" },
  { id: "settled", label: "Saldadas" },
  { id: "all",     label: "Todas"    },
]

export function Debts() {
  const { user } = useAuth()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("open")
  const [dirFilter, setDirFilter] = useState<DirFilter>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from("debts")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDebts(data ?? [])
        setLoading(false)
      })
  }, [user, refreshKey])

  const filtered = useMemo(() => {
    return debts.filter(d => {
      if (filter !== "all" && d.status !== filter) return false
      if (dirFilter !== "all" && d.direction !== dirFilter) return false
      return true
    })
  }, [debts, filter, dirFilter])

  const totals = useMemo(() => {
    const open = debts.filter(d => d.status === "open")
    const owedToMe = open.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + Number(d.amount_bs), 0)
    const iOwe = open.filter(d => d.direction === "i_owe").reduce((s, d) => s + Number(d.amount_bs), 0)
    return { owedToMe, iOwe, net: owedToMe - iOwe }
  }, [debts])

  async function toggleStatus(d: Debt) {
    const newStatus = d.status === "open" ? "settled" : "open"
    await supabase
      .from("debts")
      .update({
        status: newStatus,
        settled_at: newStatus === "settled" ? new Date().toISOString() : null,
      })
      .eq("id", d.id)
    setRefreshKey(k => k + 1)
  }

  function openEdit(d: Debt, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(d)
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deudas</h2>
          <p className="text-sm text-zinc-500 mt-1">Quién debe a quién</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950 active:scale-95 transition-transform"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/30 to-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">Me deben</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatBs(totals.owedToMe)}</p>
        </div>
        <div className="rounded-2xl border border-red-900/40 bg-gradient-to-br from-red-950/30 to-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">Yo debo</p>
          <p className="text-2xl font-bold text-red-400 tabular-nums">{formatBs(totals.iOwe)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-6">
        <p className="text-xs text-zinc-500 mb-1">Balance neto</p>
        <p className={cn(
          "text-3xl font-bold tabular-nums",
          totals.net > 0 ? "text-emerald-400" : totals.net < 0 ? "text-red-400" : "text-zinc-50"
        )}>
          {totals.net > 0 ? "+" : ""}{formatBs(totals.net)}
        </p>
        <p className="text-[11px] text-zinc-500 mt-1">
          {totals.net > 0
            ? "Si todos pagaran, te caerían estos Bs"
            : totals.net < 0
            ? "Si saldás todo, te van estos Bs"
            : "Estás a mano"}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 shrink-0",
              filter === f.id
                ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                : "bg-zinc-900 text-zinc-400 border-zinc-800"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
        <button
          onClick={() => setDirFilter("all")}
          className={cn(
            "py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
            dirFilter === "all" ? "bg-zinc-800 text-zinc-50" : "text-zinc-500"
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setDirFilter("owed_to_me")}
          className={cn(
            "py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
            dirFilter === "owed_to_me" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500"
          )}
        >
          Me deben
        </button>
        <button
          onClick={() => setDirFilter("i_owe")}
          className={cn(
            "py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
            dirFilter === "i_owe" ? "bg-red-500/20 text-red-400" : "text-zinc-500"
          )}
        >
          Yo debo
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Cargando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-sm text-zinc-400 font-medium">
            {filter === "open" ? "Sin deudas abiertas" : "Sin deudas"}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {filter === "open"
              ? "Crea una cuando alguien te deba o le debas a alguien"
              : "Cambiá el filtro arriba"}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map(d => {
          const isOwedToMe = d.direction === "owed_to_me"
          const isSettled = d.status === "settled"

          return (
            <li
              key={d.id}
              onClick={(e) => openEdit(d, e)}
              className={cn(
                "p-4 rounded-xl border bg-zinc-900 cursor-pointer transition-all active:scale-[0.99]",
                isSettled
                  ? "border-zinc-900 opacity-60 hover:opacity-80"
                  : "border-zinc-800 hover:bg-zinc-800/70 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0",
                  isOwedToMe ? "bg-emerald-500/20" : "bg-red-500/20"
                )}>
                  {isOwedToMe ? "🤝" : "💳"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{d.counterparty_name}</p>
                    {isSettled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                        Saldada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {isOwedToMe ? "Te debe" : "Le debés"}
                    {d.description && ` · ${d.description}`}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {format(new Date(d.created_at), "d MMM yyyy", { locale: es })}
                    {d.settled_at && ` · saldada ${format(new Date(d.settled_at), "d MMM", { locale: es })}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <p className={cn(
                    "font-bold tabular-nums text-lg",
                    isOwedToMe ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatBs(Number(d.amount_bs))}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-zinc-800">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStatus(d) }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-90",
                    isSettled
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      : "text-emerald-400 hover:bg-emerald-500/10"
                  )}
                >
                  {isSettled ? <><RotateCcw size={12} /> Reabrir</> : <><Check size={12} /> Saldar</>}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <DebtModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
        editing={editing}
      />
    </div>
  )
}
