import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Payer } from "@/lib/types"

export function usePayers(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["payers", userId],
    queryFn: async (): Promise<Payer[]> => {
      if (!userId) return []
      const { data } = await supabase
        .from("payers").select("*")
        .is("archived_at", null)
        .order("is_self", { ascending: false })
        .order("name")
      return data ?? []
    },
    enabled: !!userId,
  })
  return { payers: query.data ?? [], loading: query.isLoading }
}
