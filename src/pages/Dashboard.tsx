import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"

export function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-zinc-500">Hola</p>
            <h1 className="text-2xl font-semibold">{user?.email}</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Salir
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Balance del mes</p>
          <p className="mt-2 text-5xl font-bold tracking-tight">Bs 0,00</p>
          <p className="mt-2 text-xs text-zinc-600">
            (próximo paso: cargar movimientos reales)
          </p>
        </div>
      </div>
    </div>
  )
}
