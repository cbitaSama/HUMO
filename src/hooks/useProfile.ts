import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/types"

export function useProfile(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      return data
    },
    enabled: !!userId,
  })
  return { profile: query.data ?? null, loading: query.isLoading }
}
