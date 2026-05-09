import { supabase } from "./supabase"
import type { SavingsGoal } from "./types"

/**
 * Crea una transacción vinculada a un movimiento de ahorro.
 * Deposit -> expense (sale del balance disponible).
 * Withdraw -> income (vuelve al balance).
 */
export async function createTxForSavingsMovement(
  userId: string,
  goal: SavingsGoal,
  direction: "deposit" | "withdraw",
  amount: number,
  occurredAt: string,
  note: string | null
): Promise<string | null> {
  // Buscar la categoría Ahorro del usuario
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("is_savings", true)
    .maybeSingle()

  // Buscar el payer "Yo"
  const { data: self } = await supabase
    .from("payers")
    .select("id")
    .eq("user_id", userId)
    .eq("is_self", true)
    .maybeSingle()

  const title = direction === "deposit"
    ? `Ahorro · ${goal.name}`
    : `Retiro · ${goal.name}`

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      kind: direction === "deposit" ? "expense" : "income",
      amount_bs: amount,
      title,
      note,
      category_id: cat?.id ?? null,
      payer_id: self?.id ?? null,
      occurred_at: occurredAt,
    })
    .select("id")
    .single()

  if (error || !data) return null
  return data.id
}

export async function deleteTxById(id: string): Promise<void> {
  await supabase.from("transactions").delete().eq("id", id)
}
