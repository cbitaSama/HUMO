import { supabase } from "./supabase"

type Seed = {
  name: string
  kind: "expense" | "income" | "both"
  color: string
  icon: string
}

const REQUIRED: Seed[] = [
  { name: "Vicios",        kind: "expense", color: "#dc2626", icon: "🍻" },
  { name: "Trabajo extra", kind: "income",  color: "#10b981", icon: "💼" },
]

/**
 * Garantiza que las categorías requeridas existan para el usuario.
 * Idempotente: si ya existen (por nombre, case-insensitive) no las duplica.
 */
export async function ensureRequiredCategories(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId)
    .is("archived_at", null)

  const existingNames = new Set((existing ?? []).map(c => c.name.toLowerCase()))
  const toInsert = REQUIRED
    .filter(r => !existingNames.has(r.name.toLowerCase()))
    .map(r => ({ ...r, user_id: userId }))

  if (toInsert.length === 0) return

  await supabase.from("categories").insert(toInsert)
}
