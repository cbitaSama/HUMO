import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import type { Category } from "@/lib/types"

export function useCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from("categories")
      .select("*")
      .is("archived_at", null)
      .order("name")
      .then(({ data }) => {
        setCategories(data ?? [])
        setLoading(false)
      })
  }, [userId])

  return { categories, loading }
}
