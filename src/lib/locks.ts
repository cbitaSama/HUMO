import { supabase } from "./supabase"

export async function loadLockedTxIds(): Promise<Set<string>> {
  const set = new Set<string>()

  const [d1, d2, d3, d4] = await Promise.all([
    supabase.from("debts").select("initial_transaction_id, settlement_transaction_id"),
    supabase.from("debt_groups").select("initial_transaction_id"),
    supabase.from("debt_group_participants").select("settlement_transaction_id"),
    supabase.from("savings_movements").select("transaction_id"),
  ])

  for (const r of d1.data ?? []) {
    if (r.initial_transaction_id) set.add(r.initial_transaction_id)
    if (r.settlement_transaction_id) set.add(r.settlement_transaction_id)
  }
  for (const r of d2.data ?? []) {
    if (r.initial_transaction_id) set.add(r.initial_transaction_id)
  }
  for (const r of d3.data ?? []) {
    if (r.settlement_transaction_id) set.add(r.settlement_transaction_id)
  }
  for (const r of d4.data ?? []) {
    if (r.transaction_id) set.add(r.transaction_id)
  }

  return set
}
