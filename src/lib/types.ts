export type TransactionKind = "expense" | "income"
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly"
export type DebtDirection = "owed_to_me" | "i_owe"
export type DebtStatus = "open" | "settled"
export type CategoryKind = "expense" | "income" | "both"

export type Profile = {
  id: string
  display_name: string | null
  currency: string
  humo_threshold_bs: number
  sin_humo_personality: "soft" | "brutal" | "funny" | null
  timezone: string
  created_at: string
  updated_at: string
}

export type Payer = {
  id: string
  user_id: string
  name: string
  is_self: boolean
  color: string
  icon: string
  created_at: string
  archived_at: string | null
}

export type Category = {
  id: string
  user_id: string
  name: string
  kind: CategoryKind
  color: string
  icon: string
  created_at: string
  archived_at: string | null
}

export type Transaction = {
  id: string
  user_id: string
  kind: TransactionKind
  amount_bs: number
  title: string
  note: string | null
  category_id: string | null
  payer_id: string | null
  occurred_at: string
  recurring_template_id: string | null
  created_at: string
}

export type RecurringTemplate = {
  id: string
  user_id: string
  kind: TransactionKind
  amount_bs: number
  title: string
  note: string | null
  category_id: string | null
  payer_id: string | null
  frequency: RecurrenceFrequency
  interval_count: number
  day_of_month: number | null
  day_of_week: number | null
  start_date: string
  end_date: string | null
  next_run_date: string
  last_run_date: string | null
  active: boolean
  created_at: string
}

export type Debt = {
  id: string
  user_id: string
  direction: DebtDirection
  counterparty_name: string
  amount_bs: number
  description: string | null
  status: DebtStatus
  auto_create_transaction: boolean
  initial_transaction_id: string | null
  settlement_transaction_id: string | null
  category_id: string | null
  created_at: string
  settled_at: string | null
}

export type DebtGroup = {
  id: string
  user_id: string
  title: string
  description: string | null
  total_amount_bs: number
  auto_create_transaction: boolean
  category_id: string | null
  initial_transaction_id: string | null
  created_at: string
  archived_at: string | null
}

export type DebtGroupParticipant = {
  id: string
  group_id: string
  user_id: string
  name: string
  amount_bs: number
  status: DebtStatus
  settlement_transaction_id: string | null
  settled_at: string | null
  created_at: string
}

export type SavingsGoal = {
  id: string
  user_id: string
  name: string
  emoji: string
  color: string
  target_amount_bs: number | null
  target_date: string | null
  is_default: boolean
  archived_at: string | null
  created_at: string
}

export type SavingsMovement = {
  id: string
  user_id: string
  goal_id: string
  direction: "deposit" | "withdraw"
  amount_bs: number
  note: string | null
  occurred_at: string
  transaction_id: string | null
  created_at: string
}
