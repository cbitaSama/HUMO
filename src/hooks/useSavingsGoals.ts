import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { SavingsGoal } from "@/lib/types"

export function useSavingsGoals(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["savings_goals", userId],
    queryFn: async (): Promise<SavingsGoal[]> => {
      if (!userId) return []
      const { data } = await supabase
        .from("savings_goals").select("*")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
      return data ?? []
    },
    enabled: !!userId,
  })
  return { goals: query.data ?? [], loading: query.isLoading }
}
