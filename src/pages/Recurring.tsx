import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { formatBs } from "@/lib/utils"
import { useEffect, useState } from "react"
import type { RecurringTemplate, Category, Payer } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Pause, Play, Trash2, Pencil } from "lucide-react"
import { RecurringModal } from "@/components/recurring/RecurringModal"

type RecurringWithRefs = RecurringTemplate & {
  category?: Pick<Category, "name" | "icon" | "color"> | null
  payer?: Pick<Payer, "name" | "icon"> | null
}

const FREQ_LABEL: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
}

export function Recurring() {
  const { user } = useAuth()
  const [items, setItems] = useState<RecurringWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTemplate | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from("recurring_templates")
      .select(`
        *,
        category:categories(name, icon, color),
        payer:payers(name, icon)
      `)
      .order("active", { ascending: false })
      .order("next_run_date", { ascending: true })
      .then(({ data }) => {
        setItems((data as RecurringWithRefs[]) ?? [])
        setLoading(false)
      })
  }, [user, refreshKey])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("recurring_templates").update({ active: !current }).eq("id", id)
    setRefreshKey(k => k + 1)
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este recurrente? Las transacciones ya creadas no se borran.")) return
    await supabase.from("recurring_templates").delete().eq("id", id)
    setRefreshKey(k => k + 1)
  }

  function openEdit(it: RecurringTemplate) {
    setEditing(it)
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
          <h2 className="text-2xl font-bold tracking-tight">Recurrentes</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Pagos e ingresos automáticos
          </p>
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

      {!loading && items.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-sm text-zinc-400 font-medium">Sin recurrentes todavía</p>
          <p className="text-xs text-zinc-600 mt-1 mb-4">
            Cargá tu alquiler, mesada o sueldo y se anotan solos cada mes
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            <Plus size={16} strokeWidth={2.5} />
            Crear el primero
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {items.map(it => (
          <li
            key={it.id}
            className={`p-4 rounded-xl border bg-zinc-900 ${
              it.active ? "border-zinc-800" : "border-zinc-900 opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">
                {it.category?.icon ?? (it.kind === "expense" ? "💸" : "💰")}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{it.title}</p>
                  {!it.active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                      Pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">
                  {FREQ_LABEL[it.frequency]}
                  {it.frequency === "monthly" && it.day_of_month && ` · día ${it.day_of_month}`}
                  {it.payer && ` · ${it.payer.icon} ${it.payer.name}`}
                </p>
              </div>

              <p className={`font-bold tabular-nums shrink-0 ${
                it.kind === "expense" ? "text-red-400" : "text-emerald-400"
              }`}>
                {it.kind === "expense" ? "−" : "+"}{formatBs(Number(it.amount_bs))}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                {it.active
                  ? `Próxima: ${format(new Date(it.next_run_date + "T12:00:00"), "d MMM yyyy", { locale: es })}`
                  : "Pausado"}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(it.id, it.active)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  title={it.active ? "Pausar" : "Reanudar"}
                >
                  {it.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => openEdit(it)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <RecurringModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
        editing={editing}
      />
    </div>
  )
}
