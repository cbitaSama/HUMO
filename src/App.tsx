import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"

function App() {
  const [status, setStatus] = useState<string>("Conectando...")

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (error) setStatus("Error: " + error.message)
      else setStatus("✓ Conectado a Supabase")
    })
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-50">
      <h1 className="text-7xl font-bold tracking-tight">Humo</h1>
      <p className="text-zinc-400 text-lg">No dejes que tu plata se haga humo.</p>
      <p className="text-sm text-zinc-500 mt-8">{status}</p>
    </div>
  )
}

export default App
