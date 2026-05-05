import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { formatBs } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import type { Payer } from "@/lib/types"
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react"
import { PayerModal } from "@/components/payers/PayerModal"
import { PayerDetail } from "@/pages/PayerDetail"

type PayerStats = {
  payer: Payer
  monthTotal: number
  allTimeTotal: number
  monthCount: number
  allTimeCount: number
}

export function Payers() {
  const { user } = useAuth()
  const [payers, setPayers] = useState<Payer[]>([])
  const [stats, setStats] = useState<Record<string, { month: number; all: number; mc: number; ac: number }>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Payer | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    Promise.all([
      supabase.from("payers").select("*").is("archived_at", null).order("is_self", { ascending: false }).order("name"),
      supabase.from("transactions").select("payer_id, amount_bs").eq("kind", "expense"),
      supabase.from("transactions").select("payer_id, amount_bs").eq("kind", "expense").gte("occurred_at", monthStart).lt("occurred_at", monthEnd),
    ]).then(([pRes, allRes, mRes]) => {
      const acc: Record<string, { month: number; all: number; mc: number; ac: number }> = {}
      for (const t of allRes.data ?? []) {
        if (!t.payer_id) continue
        acc[t.payer_id] ??= { month: 0, all: 0, mc: 0, ac: 0 }
        acc[t.payer_id].all += Number(t.amount_bs)
        acc[t.payer_id].ac += 1
      }
      for (const t of mRes.data ?? []) {
        if (!t.payer_id) continue
        acc[t.payer_id] ??= { month: 0, all: 0, mc: 0, ac: 0 }
        acc[t.payer_id].month += Number(t.amount_bs)
        acc[t.payer_id].mc += 1
      }
      setPayers(pRes.data ?? [])
      setStats(acc)
      setLoading(false)

      // Si tenemos un selectedPayer, refrescamos su data
      if (selectedPayer) {
        const updated = (pRes.data ?? []).find(p => p.id === selectedPayer.id)
        if (updated) setSelectedPayer(updated)
        else setSelectedPayer(null)
      }
    })
  }, [user, refreshKey])

  const enriched: PayerStats[] = useMemo(
    () => payers.map(p => ({
      payer: p,
      monthTotal: stats[p.id]?.month ?? 0,
      allTimeTotal: stats[p.id]?.all ?? 0,
      monthCount: stats[p.id]?.mc ?? 0,
      allTimeCount: stats[p.id]?.ac ?? 0,
    })),
    [payers, stats]
  )

  async function remove(p: Payer) {
    if (p.is_self) return alert("No podés eliminar tu pagador 'Yo'")
    if (!confirm(`¿Archivar a ${p.name}?`)) return
    await supabase.from("payers").update({ archived_at: new Date().toISOString() }).eq("id", p.id)
    setRefreshKey(k => k + 1)
  }

  function openEdit(p: Payer, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(p)
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  // Vista detail
  if (selectedPayer) {
    return (
      <PayerDetail
        payer={selectedPayer}
        onBack={() => setSelectedPayer(null)}
        onPayerUpdated={() => setRefreshKey(k => k + 1)}
      />
    )
  }

  const others = enriched.filter(e => !e.payer.is_self)
  const me = enriched.find(e => e.payer.is_self)

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-5xl md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pagadores</h2>
          <p className="text-sm text-zinc-500 mt-1">Quién paga qué</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950 active:scale-95 transition-transform"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Cargando...</p>}

      {me && (
        <div className="mb-6">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Mis gastos</p>
          <button
            onClick={() => setSelectedPayer(me.payer)}
            className="w-full text-left rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 hover:border-zinc-700 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: me.payer.color + "33", border: `2px solid ${me.payer.color}` }}
              >
                {me.payer.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg">{me.payer.name}</p>
                <p className="text-xs text-zinc-500">{me.monthCount} movimientos este mes</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Este mes</p>
                <p className="text-2xl font-bold tabular-nums">{formatBs(me.monthTotal)}</p>
                <p className="text-[11px] text-zinc-600 tabular-nums mt-0.5">
                  Total: {formatBs(me.allTimeTotal)}
                </p>
              </div>
              <ChevronRight size={18} className="text-zinc-600 shrink-0" />
            </div>
          </button>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Gastos de otros (no cuentan como tuyos)
        </p>

        {others.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-400 font-medium">Sin otros pagadores</p>
            <p className="text-xs text-zinc-600 mt-1">Agregá a tu papá, mamá, o amigos que pagan por vos</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {others.map(({ payer, monthTotal, allTimeTotal, monthCount }) => (
              <li key={payer.id}>
                <button
                  onClick={() => setSelectedPayer(payer)}
                  className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:bg-zinc-800/70 hover:border-zinc-700 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                      style={{ background: payer.color + "33", border: `2px solid ${payer.color}` }}
                    >
                      {payer.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{payer.name}</p>
                      <p className="text-xs text-zinc-500">{monthCount} movimientos este mes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">{formatBs(monthTotal)}</p>
                      <p className="text-[11px] text-zinc-600 tabular-nums">
                        Total: {formatBs(allTimeTotal)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600 shrink-0" />
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-zinc-800">
                    <button
                      onClick={(e) => openEdit(payer, e)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-90 transition"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(payer) }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 active:scale-90 transition"
                      title="Archivar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PayerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
        editing={editing}
      />
    </div>
  )
}
