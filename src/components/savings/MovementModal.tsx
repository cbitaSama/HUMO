import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { cn, formatBs } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Sheet } from "@/components/Sheet"
import { createTxForSavingsMovement } from "@/lib/savings"
import type { SavingsGoal } from "@/lib/types"

type Props = {
  open: boolean
  onClose: () => void
  goal: SavingsGoal
  currentTotal: number
  defaultDirection?: "deposit" | "withdraw"
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function MovementModal({ open, onClose, goal, currentTotal, defaultDirection = "deposit" }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [direction, setDirection] = useState<"deposit" | "withdraw">(defaultDirection)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [occurredAt, setOccurredAt] = useState(toLocalInputValue(new Date().toISOString()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDirection(defaultDirection)
    setAmount(""); setNote("")
    setOccurredAt(toLocalInputValue(new Date().toISOString()))
    setError(null)
  }, [open, defaultDirection])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount.replace(",", "."))
    if (isNaN(amountNum) || amountNum <= 0) return setError("Monto inválido")
    if (direction === "withdraw" && amountNum > currentTotal) {
      return setError(`Solo tenés ${formatBs(currentTotal)} en esta meta`)
    }

    setSaving(true)
    const occurredISO = new Date(occurredAt).toISOString()

    const txId = await createTxForSavingsMovement(
      user!.id, goal, direction, amountNum, occurredISO, note.trim() || null
    )

    const { error: mvErr } = await supabase.from("savings_movements").insert({
      user_id: user!.id, goal_id: goal.id,
      direction, amount_bs: amountNum,
      note: note.trim() || null,
      occurred_at: occurredISO,
      transaction_id: txId,
    })

    if (mvErr) { setSaving(false); return setError(mvErr.message) }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ["savings_movements"] }),
      qc.invalidateQueries({ queryKey: ["savings_totals"] }),
    ])

    setSaving(false)
    onClose()
  }

  return (
    <Sheet
      open={open} onClose={onClose}
      title={`${goal.emoji}  ${goal.name}`}
      footer={
        <motion.button type="submit" form="mv-form"
          disabled={saving}
          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
          className={cn("w-full rounded-xl py-3 text-base font-semibold transition disabled:opacity-50",
            direction === "deposit" ? "bg-emerald-500 text-zinc-950" : "bg-amber-500 text-zinc-950")}>
          {saving ? "Guardando..." : direction === "deposit" ? "Depositar" : "Retirar"}
        </motion.button>
      }
    >
      <form id="mv-form" onSubmit={handleSubmit} className="space-y-4">

        <div className="rounded-2xl p-4 text-center"
             style={{ background: goal.color + "1a", border: `1px solid ${goal.color}33` }}>
          <p className="text-xs text-zinc-400 mb-1">Ahorrado en esta meta</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: goal.color }}>
            {formatBs(currentTotal)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button type="button" onClick={() => setDirection("deposit")}
            className={cn("py-2 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5",
              direction === "deposit" ? "bg-emerald-500/20 text-emerald-400 shadow-inner" : "text-zinc-500")}>
            <ArrowDown size={14} /> Depositar
          </button>
          <button type="button" onClick={() => setDirection("withdraw")}
            className={cn("py-2 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5",
              direction === "withdraw" ? "bg-amber-500/20 text-amber-400 shadow-inner" : "text-zinc-500")}>
            <ArrowUp size={14} /> Retirar
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Monto (Bs)</label>
          <input type="text" inputMode="decimal" required value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-4 text-3xl font-bold tracking-tight outline-none focus:border-zinc-600 transition-colors"
            placeholder="0,00" autoFocus />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Fecha y hora</label>
          <input type="datetime-local" value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]" />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 px-4 py-3 text-sm outline-none focus:border-zinc-600 transition-colors"
            placeholder={direction === "deposit" ? "De qué viene..." : "Para qué..."} />
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          {direction === "deposit"
            ? "Se registra como gasto en tu balance principal — la plata ya está apartada."
            : "Vuelve a tu balance disponible como ingreso."}
        </p>

        {error && <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">{error}</p>}
      </form>
    </Sheet>
  )
}
