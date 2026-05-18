import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react"
import { Sheet } from "@/components/Sheet"
import { useAuth } from "@/hooks/useAuth"
import { useCategories } from "@/hooks/useCategories"
import { usePayers } from "@/hooks/usePayers"
import { parseBankStatement, applyExchangeRate, type ParsedTx, type ParseResult } from "@/lib/bank-parser"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Step = "upload" | "processing" | "review" | "importing" | "done"

type Props = {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function BankImportSheet({ open, onClose, onDone }: Props) {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { payers } = usePayers(user?.id)

  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [txs, setTxs] = useState<ParsedTx[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [importedCount, setImportedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep("upload")
    setFile(null)
    setError(null)
    setResult(null)
    setTxs([])
    setAnswers({})
    setImportedCount(0)
  }

  function handleClose() {
    reset()
    onClose()
  }

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setError(null)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function analyze() {
    if (!file || !user) return
    setStep("processing")
    setError(null)
    try {
      const parsed = await parseBankStatement(file, categories, payers)
      setResult(parsed)
      setTxs(parsed.transactions)
      setStep("review")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado")
      setStep("upload")
    }
  }

  function applyAnswers(currentTxs: ParsedTx[]): ParsedTx[] {
    if (!result) return currentTxs
    let out = [...currentTxs]
    for (const q of result.questions) {
      const ans = answers[q.id]
      if (!ans) continue
      if (q.id === "exchange_rate" || q.type === "number") {
        const rate = parseFloat(ans)
        if (!isNaN(rate) && rate > 0) out = applyExchangeRate(out, rate)
      }
    }
    return out
  }

  async function doImport() {
    if (!user) return
    setStep("importing")
    const toImport = applyAnswers(txs).filter(t => t.include)
    const rows = toImport.map(t => ({
      user_id: user.id,
      kind: t.kind,
      amount_bs: t.amount,
      title: t.title.trim() || t.description.slice(0, 60),
      note: t.description !== t.title ? t.description : null,
      category_id: t.category_id ?? null,
      payer_id: null,
      occurred_at: new Date(t.date + "T12:00:00").toISOString(),
    }))

    const { error: err } = await supabase.from("transactions").insert(rows)
    if (err) {
      setError(err.message)
      setStep("review")
      return
    }
    setImportedCount(rows.length)
    setStep("done")
    onDone()
  }

  function updateTx(id: string, patch: Partial<ParsedTx>) {
    setTxs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const includedCount = txs.filter(t => t.include).length

  const needsExchangeRate = result && result.currency !== "Bs"

  // ── Step: Upload ─────────────────────────────────────────────────────────
  const uploadContent = (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Subí tu extracto bancario y la IA lo analizará para importar los movimientos automáticamente.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all",
          dragging
            ? "border-zinc-400 bg-zinc-800/60"
            : file
              ? "border-emerald-600 bg-emerald-950/20"
              : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50"
        )}
      >
        <Upload size={28} className={file ? "text-emerald-400" : "text-zinc-500"} />
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium text-emerald-400">{file.name}</p>
            <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(0)} KB · listo para analizar</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">Arrastrá o tocá para subir</p>
            <p className="text-xs text-zinc-500 mt-1">PDF, imagen (JPG/PNG) o texto (.txt, .csv)</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,image/*,text/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-950 border border-red-900 px-4 py-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )

  const uploadFooter = (
    <motion.button
      onClick={analyze}
      disabled={!file}
      whileTap={{ scale: 0.97 }}
      className="w-full py-3 rounded-xl font-semibold text-sm bg-zinc-50 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
    >
      Analizar con IA
    </motion.button>
  )

  // ── Step: Processing ─────────────────────────────────────────────────────
  const processingContent = (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 size={36} className="text-zinc-400 animate-spin" />
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Analizando extracto...</p>
        <p className="text-xs text-zinc-500 mt-1">La IA está leyendo las transacciones</p>
      </div>
    </div>
  )

  // ── Step: Review ─────────────────────────────────────────────────────────
  const reviewContent = result && (
    <div className="space-y-5">

      {/* Bank / currency info */}
      <div className="flex items-center gap-2 flex-wrap">
        {result.bank_name && (
          <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-full">
            🏦 {result.bank_name}
          </span>
        )}
        <span className={cn(
          "text-xs border px-3 py-1 rounded-full",
          needsExchangeRate
            ? "bg-amber-950 border-amber-800 text-amber-300"
            : "bg-zinc-800 border-zinc-700 text-zinc-300"
        )}>
          {needsExchangeRate ? "⚠️ " : ""}Moneda detectada: {result.currency}
        </span>
        <span className="text-xs text-zinc-500">{result.transactions.length} transacciones encontradas</span>
      </div>

      {/* Critical questions from AI */}
      {result.questions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">La IA necesita saber</p>
          {result.questions.map(q => (
            <div key={q.id} className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 space-y-2">
              <p className="text-sm text-amber-200">{q.question}</p>
              {q.type === "select" && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border transition-all",
                        answers[q.id] === opt
                          ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                          : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "number" && (
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="ej: 6.96"
                  value={answers[q.id] ?? ""}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Exchange rate prompt if foreign currency and no question covered it */}
      {needsExchangeRate && !result.questions.some(q => q.type === "number") && (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 space-y-2">
          <p className="text-sm text-amber-200">
            El extracto está en <strong>{result.currency}</strong>. ¿Cuál es la tasa de cambio a Bs?
          </p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ej: 6.96"
            value={answers["__rate"] ?? ""}
            onChange={e => setAnswers(a => ({ ...a, __rate: e.target.value }))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-950 border border-red-900 px-4 py-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Transacciones · {includedCount} seleccionadas
        </p>
        <SelectAllBar
          allIncluded={txs.every(t => t.include)}
          onToggle={v => setTxs(prev => prev.map(t => ({ ...t, include: v })))}
        />
        {txs.map(t => (
          <TxRow
            key={t.id}
            tx={t}
            categories={categories}
            onChange={patch => updateTx(t.id, patch)}
          />
        ))}
      </div>
    </div>
  )

  const reviewFooter = (
    <motion.button
      onClick={doImport}
      disabled={includedCount === 0}
      whileTap={{ scale: 0.97 }}
      className="w-full py-3 rounded-xl font-semibold text-sm bg-zinc-50 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
    >
      {includedCount === 0 ? "Seleccioná al menos una" : `Importar ${includedCount} transaccion${includedCount !== 1 ? "es" : ""}`}
    </motion.button>
  )

  // ── Step: Importing ───────────────────────────────────────────────────────
  const importingContent = (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 size={36} className="text-zinc-400 animate-spin" />
      <p className="text-sm font-medium text-zinc-300">Guardando movimientos...</p>
    </div>
  )

  // ── Step: Done ────────────────────────────────────────────────────────────
  const doneContent = (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <CheckCircle2 size={44} className="text-emerald-400" />
      <div className="text-center">
        <p className="text-base font-semibold text-zinc-100">
          {importedCount} movimiento{importedCount !== 1 ? "s" : ""} importado{importedCount !== 1 ? "s" : ""}
        </p>
        <p className="text-sm text-zinc-500 mt-1">Ya aparecen en tus movimientos</p>
      </div>
    </div>
  )

  const doneFooter = (
    <motion.button
      onClick={handleClose}
      whileTap={{ scale: 0.97 }}
      className="w-full py-3 rounded-xl font-semibold text-sm bg-zinc-50 text-zinc-950"
    >
      Listo
    </motion.button>
  )

  const titles: Record<Step, string> = {
    upload: "Importar extracto",
    processing: "Analizando...",
    review: "Revisá las transacciones",
    importing: "Importando...",
    done: "¡Importado!",
  }

  const contentMap: Record<Step, React.ReactNode> = {
    upload: uploadContent,
    processing: processingContent,
    review: reviewContent,
    importing: importingContent,
    done: doneContent,
  }

  const footerMap: Partial<Record<Step, React.ReactNode>> = {
    upload: uploadFooter,
    review: reviewFooter,
    done: doneFooter,
  }

  return (
    <Sheet open={open} onClose={handleClose} title={titles[step]} footer={footerMap[step]}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {contentMap[step]}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectAllBar({ allIncluded, onToggle }: { allIncluded: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(!allIncluded)}
      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      {allIncluded ? "Deseleccionar todas" : "Seleccionar todas"}
    </button>
  )
}

type Category = import("@/lib/types").Category

function TxRow({
  tx,
  categories,
  onChange,
}: {
  tx: ParsedTx
  categories: Category[]
  onChange: (patch: Partial<ParsedTx>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const filtered = categories.filter(c => !c.archived_at && (c.kind === tx.kind || c.kind === "both"))

  const dateStr = (() => {
    try { return format(new Date(tx.date + "T12:00:00"), "d MMM", { locale: es }) }
    catch { return tx.date }
  })()

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      tx.include ? "border-zinc-800 bg-zinc-900" : "border-zinc-800/40 bg-zinc-900/30 opacity-50"
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onChange({ include: !tx.include })}
          className={cn(
            "w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors",
            tx.include ? "border-zinc-300 bg-zinc-300" : "border-zinc-600"
          )}
        >
          {tx.include && <span className="text-zinc-950 text-[10px] font-bold">✓</span>}
        </button>

        {/* Kind pill */}
        <button
          onClick={() => onChange({ kind: tx.kind === "expense" ? "income" : "expense" })}
          className={cn(
            "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors",
            tx.kind === "expense"
              ? "bg-red-500/15 border-red-500/40 text-red-400"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
          )}
        >
          {tx.kind === "expense" ? "Gasto" : "Ingreso"}
        </button>

        {/* Title */}
        <input
          type="text"
          value={tx.title}
          onChange={e => onChange({ title: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600 truncate"
          placeholder="Sin título"
        />

        {/* Amount */}
        <span className={cn(
          "text-sm font-bold tabular-nums shrink-0",
          tx.kind === "expense" ? "text-red-400" : "text-emerald-400"
        )}>
          {tx.kind === "expense" ? "−" : "+"}Bs {tx.amount.toFixed(0)}
        </span>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(v => !v)} className="text-zinc-600 hover:text-zinc-400 shrink-0 transition-colors">
          <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-zinc-800 pt-3">
              {/* Description */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Descripción original</p>
                <p className="text-xs text-zinc-400">{tx.description}</p>
              </div>

              {/* Date */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Fecha · {dateStr}</p>
              </div>

              {/* Category */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Categoría</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onChange({ category_id: null, category_name: null })}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs border transition-all",
                      !tx.category_id
                        ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}
                  >
                    Sin categoría
                  </button>
                  {filtered.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onChange({ category_id: c.id, category_name: c.name })}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition-all",
                        tx.category_id === c.id
                          ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}
                    >
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
