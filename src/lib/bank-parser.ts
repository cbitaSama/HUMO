import { callGemini, fileToBase64, fileToText } from "./gemini"
import type { Category, Payer } from "./types"

export interface ParsedTx {
  id: string
  date: string          // YYYY-MM-DD
  description: string   // original from statement
  title: string         // cleaned title
  amount: number
  kind: "expense" | "income"
  category_name: string | null
  category_id: string | null
  confidence: "high" | "low"
  include: boolean
}

export interface ParseQuestion {
  id: string
  question: string
  type: "select" | "number"
  options?: string[]
}

export interface ParseResult {
  transactions: ParsedTx[]
  questions: ParseQuestion[]
  bank_name: string | null
  currency: string
}

const TEXT_TYPES = new Set(["text/plain", "text/csv", "application/csv"])
const isTextFile = (f: File) => TEXT_TYPES.has(f.type) || f.name.endsWith(".txt") || f.name.endsWith(".csv")

export async function parseBankStatement(
  file: File,
  categories: Category[],
  payers: Payer[],
): Promise<ParseResult> {
  const activeCats = categories.filter(c => !c.archived_at)
  const categoryList = activeCats.map(c => c.name).join(", ") || "ninguna"
  const payerList = payers.filter(p => !p.archived_at).map(p => p.name).join(", ") || "ninguno"

  const prompt = `Eres un asistente que analiza extractos bancarios. Extrae TODAS las transacciones.

Contexto del sistema financiero del usuario:
- Moneda base: Bs (bolivianos)
- Categorías disponibles: ${categoryList}
- Personas/pagadores: ${payerList}

Devuelve ÚNICAMENTE JSON válido con esta estructura:
{
  "bank_name": string | null,
  "currency": "Bs" | "USD" | "ARS" | string,
  "transactions": [
    {
      "id": "t1",
      "date": "YYYY-MM-DD",
      "description": "texto original del extracto",
      "title": "título corto y claro en español (máx 40 chars)",
      "amount": <número positivo>,
      "kind": "expense" | "income",
      "category_name": <nombre exacto de una categoría disponible o null>,
      "confidence": "high" | "low"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "question": "pregunta",
      "type": "select" | "number",
      "options": ["opción 1", "opción 2"]
    }
  ]
}

Reglas estrictas:
- Solo genera preguntas para información CRÍTICA que no puedas determinar (ej: tasa de cambio si el extracto está en USD/otra moneda)
- Máximo 2 preguntas. Si todo es claro, "questions": []
- NO preguntes sobre cosas obvias
- amounts siempre positivos; usa "kind" para la dirección
- category_name debe ser exactamente igual a uno de: ${categoryList} — o null si ninguna aplica
- Si hay transferencias entre cuentas propias, márcalas como income o exclúyelas según el contexto`

  let parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>

  if (isTextFile(file)) {
    const text = await fileToText(file)
    parts = [{ text: prompt + "\n\nExtracto bancario:\n" + text }]
  } else {
    const base64 = await fileToBase64(file)
    parts = [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64 } }]
  }

  const raw = await callGemini(parts)
  const parsed = JSON.parse(raw) as {
    bank_name: string | null
    currency: string
    transactions: Array<{
      id: string; date: string; description: string; title: string
      amount: number; kind: "expense" | "income"; category_name: string | null
      confidence: "high" | "low"
    }>
    questions: ParseQuestion[]
  }

  const transactions: ParsedTx[] = (parsed.transactions ?? []).map(t => {
    const matched = t.category_name
      ? activeCats.find(c => c.name.toLowerCase() === t.category_name!.toLowerCase())
      : null
    return { ...t, category_id: matched?.id ?? null, include: true }
  })

  return {
    transactions,
    questions: parsed.questions ?? [],
    bank_name: parsed.bank_name ?? null,
    currency: parsed.currency ?? "Bs",
  }
}

export function applyExchangeRate(txs: ParsedTx[], rate: number): ParsedTx[] {
  return txs.map(t => ({ ...t, amount: parseFloat((t.amount * rate).toFixed(2)) }))
}
