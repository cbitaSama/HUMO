import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { SavingsMovement } from "@/lib/types"

export function useSavingsMovements(goalId: string | undefined) {
  const query = useQuery({
    queryKey: ["savings_movements", goalId],
    queryFn: async (): Promise<SavingsMovement[]> => {
      if (!goalId) return []
      const { data } = await supabase
        .from("savings_movements").select("*")
        .eq("goal_id", goalId)
        .order("occurred_at", { ascending: false })
      return data ?? []
    },
    enabled: !!goalId,
  })
  return { movements: query.data ?? [], loading: query.isLoading }
}
