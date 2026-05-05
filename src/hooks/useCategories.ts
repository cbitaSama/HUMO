import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Category } from "@/lib/types"

export function useCategories(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["categories", userId],
    queryFn: async (): Promise<Category[]> => {
      if (!userId) return []
      const { data } = await supabase
        .from("categories").select("*")
        .is("archived_at", null)
        .order("name")
      return data ?? []
    },
    enabled: !!userId,
  })
  return { categories: query.data ?? [], loading: query.isLoading }
}
