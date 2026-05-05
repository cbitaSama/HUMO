import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { formatBs } from "@/lib/utils"

export function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const firstName = profile?.display_name?.split(" ")[0] ?? ""

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-none md:p-8">
      <div className="mb-8">
        <p className="text-sm text-zinc-500">Hola,</p>
        <h2 className="text-3xl font-bold tracking-tight">{firstName} 👋</h2>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-4">
        <p className="text-sm text-zinc-500 mb-2">Balance del mes</p>
        <p className="text-5xl font-bold tracking-tight">{formatBs(0)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-1">Gastos</p>
          <p className="text-2xl font-bold text-red-400">{formatBs(0)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 mb-1">Ingresos</p>
          <p className="text-2xl font-bold text-emerald-400">{formatBs(0)}</p>
        </div>
      </div>
    </div>
  )
}
