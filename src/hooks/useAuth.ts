import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading, user: session?.user ?? null }
}
