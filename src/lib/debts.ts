import { supabase } from "./supabase"
import type { Debt, DebtGroup, DebtGroupParticipant, TransactionKind } from "./types"

async function getPrestamosCategoryId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Préstamos")
    .is("archived_at", null)
    .maybeSingle()
  if (data) return data.id

  const { data: created } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: "Préstamos", kind: "both", icon: "🤝", color: "#a855f7" })
    .select("id")
    .single()
  return created?.id ?? null
}

async function getSelfPayerId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("payers")
    .select("id")
    .eq("user_id", userId)
    .eq("is_self", true)
    .is("archived_at", null)
    .maybeSingle()
  return data?.id ?? null
}

export async function createInitialTxForDebt(debt: Debt): Promise<string | null> {
  const categoryId = debt.category_id ?? await getPrestamosCategoryId(debt.user_id)
  const payerId = await getSelfPayerId(debt.user_id)
  const kind: TransactionKind = debt.direction === "owed_to_me" ? "expense" : "income"
  const verb = debt.direction === "owed_to_me" ? "Préstamo a" : "Préstamo de"
  const { data } = await supabase.from("transactions").insert({
    user_id: debt.user_id, kind, amount_bs: debt.amount_bs,
    title: `${verb} ${debt.counterparty_name}`,
    category_id: categoryId, payer_id: payerId,
    occurred_at: debt.created_at,
  }).select("id").single()
  return data?.id ?? null
}

export async function createSettlementTxForDebt(debt: Debt): Promise<string | null> {
  const categoryId = debt.category_id ?? await getPrestamosCategoryId(debt.user_id)
  const payerId = await getSelfPayerId(debt.user_id)
  const kind: TransactionKind = debt.direction === "owed_to_me" ? "income" : "expense"
  const verb = debt.direction === "owed_to_me" ? "Cobro de" : "Pago a"
  const { data } = await supabase.from("transactions").insert({
    user_id: debt.user_id, kind, amount_bs: debt.amount_bs,
    title: `${verb} ${debt.counterparty_name}`,
    category_id: categoryId, payer_id: payerId,
  }).select("id").single()
  return data?.id ?? null
}

export async function createInitialTxForGroup(group: DebtGroup): Promise<string | null> {
  const categoryId = group.category_id ?? await getPrestamosCategoryId(group.user_id)
  const payerId = await getSelfPayerId(group.user_id)
  const { data } = await supabase.from("transactions").insert({
    user_id: group.user_id, kind: "expense", amount_bs: group.total_amount_bs,
    title: group.title, note: group.description,
    category_id: categoryId, payer_id: payerId,
    occurred_at: group.created_at,
  }).select("id").single()
  return data?.id ?? null
}

export async function createSettlementTxForParticipant(
  p: DebtGroupParticipant, groupTitle: string, userId: string
): Promise<string | null> {
  const categoryId = await getPrestamosCategoryId(userId)
  const payerId = await getSelfPayerId(userId)
  const { data } = await supabase.from("transactions").insert({
    user_id: userId, kind: "income", amount_bs: p.amount_bs,
    title: `Cobro de ${p.name}`, note: groupTitle,
    category_id: categoryId, payer_id: payerId,
  }).select("id").single()
  return data?.id ?? null
}

export async function deleteTxById(id: string | null): Promise<void> {
  if (!id) return
  await supabase.from("transactions").delete().eq("id", id)
}
