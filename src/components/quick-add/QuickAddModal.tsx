import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useCategories } from "@/hooks/useCategories"
import { usePayers } from "@/hooks/usePayers"
import { cn } from "@/lib/utils"
import { X, Trash2, Lock, Zap, RefreshCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { modalBackdrop } from "@/lib/motion"
import type { TransactionKind, Transaction } from "@/lib/types"

type LinkInfo =
  | { kind: "recurring"; templateTitle: string }
  | { kind: "debt"; debtId: string; counterparty: string; isInitial: boolean }
  | { kind: "group"; groupId: string; groupTitle: string; participantName?: string; isInitial: boolean }

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Transaction | null
  forceLocked?: boolean
}

// Sheet variants — sale desde abajo en mobile, fade+scale en desktop
const sheetMobile = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 36 } },
  exit:    { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
}

const sheetDesktop = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 380, damping: 34 } },
  exit:    { opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.2 } },
}

function useIsDesktop() {
  const [isDesktop, set] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = (e: MediaQueryListEvent) => set(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return isDesktop
}

export function QuickAddModal({ open, onClose, onSaved, editing, forceLocked }: Props) {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { payers } = usePayers(user?.id)
  const isDesktop = useIsDesktop()

  const [kind, setKind] = useState<TransactionKind>("expense")
  const [amount, setAmount] = useState("")
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [payerId, setPayerId] = useState<string | null>(null)
  const [occurredAt, setOccurredAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null)
  const [loadingLink, setLoadingLink] = useState(false)

  const filteredCategories = useMemo(
    () => categories.filter(c => c.kind === kind || c.kind === "both"),
    [categories, kind]
  )

  const isLocked = !!forceLocked || !!editing?.recurring_template_id || !!linkInfo

  function toLocalInputValue(iso: string): string {
    const d = new Date(iso)
    const off = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - off).toISOString().slice(0, 16)
  }

  useEffect(() => {
    if (!open || !editing) { setLinkInfo(null); return }
    if (!isLocked) return
    setLoadingLink(true)
    async function check() {
      if (editing!.recurring_template_id) {
        const { data } = await supabase.from("recurring_templates").select("title").eq("id", editing!.recurring_template_id).maybeSingle()
        setLinkInfo({ kind: "recurring", templateTitle: data?.title ?? "Recurrente" })
        setLoadingLink(false); return
      }
      const { data: debtRows } = await supabase.from("debts")
        .select("id, counterparty_name, initial_transaction_id, settlement_transaction_id")
        .or(`initial_transaction_id.eq.${editing!.id},settlement_transaction_id.eq.${editing!.id}`)
        .maybeSingle()
      if (debtRows) {
        setLinkInfo({
          kind: "debt", debtId: debtRows.id,
          counterparty: debtRows.counterparty_name,
          isInitial: debtRows.initial_transaction_id === editing!.id,
        })
        setLoadingLink(false); return
      }
      const { data: groupRow } = await supabase.from("debt_groups").select("id, title")
        .eq("initial_transaction_id", editing!.id).maybeSingle()
      if (groupRow) {
        setLinkInfo({ kind: "group", groupId: groupRow.id, groupTitle: groupRow.title, isInitial: true })
        setLoadingLink(false); return
      }
      const { data: partRow } = await supabase.from("debt_group_participants")
        .select("id, name, group_id, debt_groups(title)")
        .eq("settlement_transaction_id", editing!.id).maybeSingle()
      if (partRow) {
        const gTitle = (partRow as any).debt_groups?.title ?? "Grupo"
        setLinkInfo({ kind: "group", groupId: partRow.group_id, groupTitle: gTitle, participantName: partRow.name, isInitial: false })
      }
      setLoadingLink(false)
    }
    check()
  }, [open, editing, isLocked])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setKind(editing.kind)
      setAmount(String(editing.amount_bs))
      setTitle(editing.title)
      setNote(editing.note ?? "")
      setCategoryId(editing.category_id)
      setPayerId(editing.payer_id)
      setOccurredAt(toLocalInputValue(editing.occurred_at))
    } else {
      setKind("expense")
      setAmount("")
      setTitle("")
      setNote("")
      setCategoryId(null)
      const self = payers.find(p => p.is_self)
      setPayerId(self?.id ?? null)
      setOccurredAt(toLocalInputValue(new Date().toISOString()))
    }
    setError(null)
  }, [open, editing, payers])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    setError(null)
    const amountNum = parseFloat(amount.replace(",", "."))
    if (isNaN(amountNum) || amountNum <= 0) return setError("Monto inválido")
    if (!title.trim()) return setError("Falta el título")
    setSaving(true)
    const payload = {
      user_id: user!.id, kind, amount_bs: amountNum,
      title: title.trim(), note: note.trim() || null,
      category_id: categoryId, payer_id: payerId,
      occurred_at: new Date(occurredAt).toISOString(),
    }
    const { error: err } = editing
      ? await supabase.from("transactions").update(payload).eq("id", editing.id)
      : await supabase.from("transactions").insert(payload)
    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!editing || isLocked) return
    if (!confirm("¿Eliminar este movimiento?")) return
    setDeleting(true)
    const { error: err } = await supabase.from("transactions").delete().eq("id", editing.id)
    setDeleting(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalBackdrop}
          initial="initial" animate="animate" exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            variants={isDesktop ? sheetDesktop : sheetMobile}
            initial="initial" animate="animate" exit="exit"
            onClick={e => e.stopPropagation()}
            className={cn(
              "w-full md:max-w-md bg-zinc-950 border-zinc-800 flex flex-col",
              "md:border md:rounded-2xl md:max-h-[85vh]",
              "rounded-t-3xl border-t",
              "max-h-[92vh]"
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>

            {/* Header — sticky */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0">
              <h2 className="text-lg font-semibold">
                {editing ? (isLocked ? "Movimiento vinculado" : "Editar movimiento") : "Nuevo movimiento"}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Lock banner — fuera del scroll */}
            <AnimatePresence>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="mx-6 mb-3 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                        {linkInfo?.kind === "recurring" ? <RefreshCcw size={16} className="text-purple-300" /> : <Zap size={16} className="text-purple-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Lock size={11} className="text-purple-300" />
                          <p className="text-xs font-medium text-purple-200 uppercase tracking-wider">Solo lectura</p>
                        </div>
                        {loadingLink && !linkInfo ? (
                          <>
                            <div className="h-4 w-32 rounded shimmer bg-zinc-800/60 mb-1.5" />
                            <div className="h-3 w-48 rounded shimmer bg-zinc-800/40" />
                          </>
                        ) : linkInfo?.kind === "recurring" ? (
                          <>
                            <p className="text-sm text-zinc-200 font-medium truncate">{linkInfo.templateTitle}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">Generado por un recurrente. Editalo desde Recurrentes.</p>
                          </>
                        ) : linkInfo?.kind === "debt" ? (
                          <>
                            <p className="text-sm text-zinc-200 font-medium truncate">Préstamo · {linkInfo.counterparty}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {linkInfo.isInitial ? "Movimiento inicial. Para cambiarlo, eliminá la deuda." : "Movimiento de cobro. Reabrí la deuda para deshacerlo."}
                            </p>
                          </>
                        ) : linkInfo?.kind === "group" ? (
                          <>
                            <p className="text-sm text-zinc-200 font-medium truncate">
                              {linkInfo.groupTitle}{linkInfo.participantName && ` · ${linkInfo.participantName}`}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {linkInfo.isInitial ? "Gasto inicial del grupo. Para cambiarlo, eliminá el grupo." : "Cobro de un participante. Destildalo desde el grupo."}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-300">Movimiento generado automáticamente</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form: scrollable middle + sticky footer */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 pb-2">
                <fieldset disabled={isLocked} className={cn("space-y-4", isLocked && "opacity-60 pointer-events-none")}>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                    <button type="button" onClick={() => { setKind("expense"); setCategoryId(null) }}
                      className={cn("py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                        kind === "expense" ? "bg-red-500/20 text-red-400 shadow-inner" : "text-zinc-500")}>
                      Gasto
                    </button>
                    <button type="button" onClick={() => { setKind("income"); setCategoryId(null) }}
                      className={cn("py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                        kind === "income" ? "bg-emerald-500/20 text-emerald-400 shadow-inner" : "text-zinc-500")}>
                      Ingreso
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-400">Monto (Bs)</label>
                    <input type="text" inputMode="decimal" required value={amount}
                      onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600 transition-colors"
                      placeholder="0,00" autoFocus={!editing} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-400">¿Qué? *</label>
                    <input type="text" required value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
                      placeholder={kind === "expense" ? "Almuerzo, Uber, café..." : "Mesada, sueldo..."} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-400">Fecha y hora</label>
                    <input type="datetime-local" value={occurredAt}
                      onChange={e => setOccurredAt(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]" />
                  </div>

                  {kind === "expense" && (
                    <div>
                      <label className="text-xs font-medium text-zinc-400">Pagado por</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {payers.map(p => (
                          <button key={p.id} type="button" onClick={() => setPayerId(p.id)}
                            className={cn("px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95",
                              payerId === p.id ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                                                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700")}>
                            {p.icon} {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-zinc-400">Categoría</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {filteredCategories.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                          className={cn("px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95",
                            categoryId === c.id ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                                                 : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700")}>
                          {c.icon} {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600 transition-colors"
                      placeholder="Detalles..." />
                  </div>
                </fieldset>

                {error && (
                  <p className="mt-4 rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>
                )}
              </div>

              {/* Footer sticky con gradient fade arriba */}
              <div className="shrink-0 px-6 pt-3 pb-5 bg-gradient-to-t from-zinc-950 via-zinc-950 to-zinc-950/0">
                <div className="flex gap-2">
                  {editing && !isLocked && (
                    <motion.button type="button" onClick={handleDelete}
                      disabled={deleting || saving}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                      className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-red-400 hover:bg-red-900/40 transition disabled:opacity-50">
                      <Trash2 size={18} />
                    </motion.button>
                  )}
                  {isLocked ? (
                    <motion.button type="button" onClick={onClose}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 rounded-xl bg-zinc-800 py-3 text-base font-semibold text-zinc-200 transition">
                      Cerrar
                    </motion.button>
                  ) : (
                    <motion.button type="submit"
                      disabled={saving || deleting}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition disabled:opacity-50">
                      {saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
                    </motion.button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
