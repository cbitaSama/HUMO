import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn, formatBs } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import type { Debt, DebtGroup, DebtGroupParticipant } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Check, RotateCcw, Users, Handshake, Zap, Pencil } from "lucide-react"
import { DebtModal } from "@/components/debts/DebtModal"
import { SharedDebtModal } from "@/components/debts/SharedDebtModal"
import { DebtChooser } from "@/components/debts/DebtChooser"
import {
  createSettlementTxForDebt, createSettlementTxForParticipant, deleteTxById,
} from "@/lib/debts"

type GroupWithParticipants = {
  group: DebtGroup
  participants: DebtGroupParticipant[]
}

type StatusFilter = "open" | "settled" | "all"

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "open",    label: "Abiertas" },
  { id: "settled", label: "Saldadas" },
  { id: "all",     label: "Todas"    },
]

export function Debts() {
  const { user } = useAuth()
  const [debts, setDebts] = useState<Debt[]>([])
  const [groups, setGroups] = useState<GroupWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>("open")
  const [chooserOpen, setChooserOpen] = useState(false)
  const [debtModalOpen, setDebtModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [editingGroup, setEditingGroup] = useState<GroupWithParticipants | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from("debts").select("*").order("status").order("created_at", { ascending: false }),
      supabase.from("debt_groups").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("debt_group_participants").select("*"),
    ]).then(([dRes, gRes, pRes]) => {
      setDebts(dRes.data ?? [])
      const allParts = pRes.data ?? []
      const groupsWithParts = (gRes.data ?? []).map(g => ({
        group: g as DebtGroup,
        participants: allParts.filter(p => p.group_id === g.id) as DebtGroupParticipant[],
      }))
      setGroups(groupsWithParts)
      setLoading(false)
    })
  }, [user, refreshKey])

  const totals = useMemo(() => {
    const openDebts = debts.filter(d => d.status === "open")
    const owedFromDebts = openDebts.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + Number(d.amount_bs), 0)
    const iOweFromDebts = openDebts.filter(d => d.direction === "i_owe").reduce((s, d) => s + Number(d.amount_bs), 0)

    const owedFromGroups = groups.reduce((sum, g) =>
      sum + g.participants.filter(p => p.status === "open").reduce((s, p) => s + Number(p.amount_bs), 0)
    , 0)

    const owedToMe = owedFromDebts + owedFromGroups
    return { owedToMe, iOwe: iOweFromDebts, net: owedToMe - iOweFromDebts }
  }, [debts, groups])

  const visibleDebts = useMemo(() => {
    if (filter === "all") return debts
    return debts.filter(d => d.status === filter)
  }, [debts, filter])

  const visibleGroups = useMemo(() => {
    if (filter === "all") return groups
    return groups.filter(g => {
      const allSettled = g.participants.every(p => p.status === "settled")
      return filter === "open" ? !allSettled : allSettled
    })
  }, [groups, filter])

  // — Toggle individual debt status —
  async function toggleDebt(d: Debt) {
    const newStatus = d.status === "open" ? "settled" : "open"
    if (newStatus === "settled") {
      let settlementTxId: string | null = null
      if (d.auto_create_transaction) {
        settlementTxId = await createSettlementTxForDebt(d)
      }
      await supabase.from("debts").update({
        status: "settled",
        settled_at: new Date().toISOString(),
        settlement_transaction_id: settlementTxId,
      }).eq("id", d.id)
    } else {
      // Reabrir: borrar settlement tx si existía
      if (d.settlement_transaction_id) {
        await deleteTxById(d.settlement_transaction_id)
      }
      await supabase.from("debts").update({
        status: "open",
        settled_at: null,
        settlement_transaction_id: null,
      }).eq("id", d.id)
    }
    setRefreshKey(k => k + 1)
  }

  // — Toggle participant status —
  async function toggleParticipant(p: DebtGroupParticipant, gp: GroupWithParticipants) {
    const newStatus = p.status === "open" ? "settled" : "open"
    if (newStatus === "settled") {
      let txId: string | null = null
      if (gp.group.auto_create_transaction) {
        txId = await createSettlementTxForParticipant(p, gp.group.title, user!.id)
      }
      await supabase.from("debt_group_participants").update({
        status: "settled",
        settled_at: new Date().toISOString(),
        settlement_transaction_id: txId,
      }).eq("id", p.id)
    } else {
      if (p.settlement_transaction_id) {
        await deleteTxById(p.settlement_transaction_id)
      }
      await supabase.from("debt_group_participants").update({
        status: "open",
        settled_at: null,
        settlement_transaction_id: null,
      }).eq("id", p.id)
    }
    setRefreshKey(k => k + 1)
  }

  function handleChoose(mode: "individual" | "group") {
    setChooserOpen(false)
    setEditingDebt(null)
    setEditingGroup(null)
    if (mode === "individual") setDebtModalOpen(true)
    else setGroupModalOpen(true)
  }

  function openEditDebt(d: Debt) {
    setEditingDebt(d)
    setDebtModalOpen(true)
  }

  function openEditGroup(g: GroupWithParticipants) {
    setEditingGroup(g)
    setGroupModalOpen(true)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deudas</h2>
          <p className="text-sm text-zinc-500 mt-1">Préstamos y gastos compartidos</p>
        </div>
        <button
          onClick={() => setChooserOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950 active:scale-95 transition-transform"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva
        </button>
      </div>

      {/* Stats cards */}
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
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
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

      {loading && <p className="text-zinc-500 text-sm">Cargando...</p>}

      {!loading && visibleDebts.length === 0 && visibleGroups.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-sm text-zinc-400 font-medium">Sin deudas {filter === "open" ? "abiertas" : ""}</p>
          <p className="text-xs text-zinc-600 mt-1">Tocá "Nueva" para crear la primera</p>
        </div>
      )}

      <div className="space-y-3">

        {/* Grupos primero (más visuales) */}
        {visibleGroups.map(gp => {
          const settled = gp.participants.filter(p => p.status === "settled")
          const open = gp.participants.filter(p => p.status === "open")
          const totalCollected = settled.reduce((s, p) => s + Number(p.amount_bs), 0)
          const totalOwed = gp.participants.reduce((s, p) => s + Number(p.amount_bs), 0)
          const pct = totalOwed > 0 ? (totalCollected / totalOwed) * 100 : 0
          const allSettled = open.length === 0

          return (
            <div
              key={gp.group.id}
              className={cn(
                "rounded-2xl border bg-zinc-900 transition-all",
                allSettled ? "border-zinc-900 opacity-70" : "border-zinc-800"
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{gp.group.title}</p>
                      {gp.group.auto_create_transaction && (
                        <Zap size={11} className="text-purple-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Pagaste {formatBs(Number(gp.group.total_amount_bs))} · {settled.length}/{gp.participants.length} pagaron
                    </p>
                  </div>
                  <button
                    onClick={() => openEditGroup(gp)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 active:scale-90 transition shrink-0"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Participant chips */}
                <div className="flex flex-wrap gap-2">
                  {gp.participants.map(p => {
                    const isSettled = p.status === "settled"
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleParticipant(p, gp)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-90",
                          isSettled
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border-dashed border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                        )}
                      >
                        <span className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
                          isSettled
                            ? "border-emerald-400 bg-emerald-400"
                            : "border-zinc-600"
                        )}>
                          {isSettled && <Check size={9} strokeWidth={4} className="text-zinc-950" />}
                        </span>
                        <span className={cn(isSettled && "line-through opacity-70")}>
                          {p.name}
                        </span>
                        <span className="opacity-60 tabular-nums">{formatBs(Number(p.amount_bs))}</span>
                      </button>
                    )
                  })}
                </div>

                <p className="text-[11px] text-zinc-600 mt-3">
                  Cobrado: {formatBs(totalCollected)} de {formatBs(totalOwed)} · creado {format(new Date(gp.group.created_at), "d MMM", { locale: es })}
                </p>
              </div>
            </div>
          )
        })}

        {/* Deudas individuales */}
        {visibleDebts.map(d => {
          const isOwedToMe = d.direction === "owed_to_me"
          const isSettled = d.status === "settled"

          return (
            <div
              key={d.id}
              className={cn(
                "rounded-2xl border bg-zinc-900 transition-all",
                isSettled ? "border-zinc-900 opacity-60" : "border-zinc-800"
              )}
            >
              <div
                className="p-5 cursor-pointer hover:bg-zinc-800/40 transition-colors rounded-2xl"
                onClick={() => openEditDebt(d)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isOwedToMe ? "bg-emerald-500/15" : "bg-red-500/15"
                  )}>
                    <Handshake size={18} className={isOwedToMe ? "text-emerald-400" : "text-red-400"} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{d.counterparty_name}</p>
                      {d.auto_create_transaction && (
                        <Zap size={11} className="text-purple-400 shrink-0" />
                      )}
                      {isSettled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">Saldada</span>
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

                  <p className={cn(
                    "font-bold tabular-nums text-lg shrink-0",
                    isOwedToMe ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatBs(Number(d.amount_bs))}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end px-5 pb-3 border-t border-zinc-800/60 pt-3">
                <button
                  onClick={() => toggleDebt(d)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-90",
                    isSettled
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      : "text-emerald-400 hover:bg-emerald-500/10"
                  )}
                >
                  {isSettled ? <><RotateCcw size={12} /> Reabrir</> : <><Check size={12} /> Saldar</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <DebtChooser
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onPick={handleChoose}
      />

      <DebtModal
        open={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
        editing={editingDebt}
      />

      <SharedDebtModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
        editing={editingGroup}
      />
    </div>
  )
}
