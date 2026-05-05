import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import type { Payer } from "@/lib/types"

export function usePayers(userId: string | undefined) {
  const [payers, setPayers] = useState<Payer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from("payers")
      .select("*")
      .is("archived_at", null)
      .order("is_self", { ascending: false })
      .order("name")
      .then(({ data }) => {
        setPayers(data ?? [])
        setLoading(false)
      })
  }, [userId])

  return { payers, loading }
}
