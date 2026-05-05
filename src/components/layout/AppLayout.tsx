import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCcw,
  Handshake,
  Settings,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import { Dashboard } from "@/pages/Dashboard"
import { Movements } from "@/pages/Movements"
import { Recurring } from "@/pages/Recurring"
import { Debts } from "@/pages/Debts"
import { SettingsPage } from "@/pages/SettingsPage"
import { FAB } from "@/components/quick-add/FAB"
import { QuickAddModal } from "@/components/quick-add/QuickAddModal"

type Tab = "dashboard" | "movements" | "recurring" | "debts" | "settings"

const tabs = [
  { id: "dashboard" as Tab, label: "Inicio",      Icon: LayoutDashboard },
  { id: "movements" as Tab, label: "Movimientos", Icon: ArrowLeftRight },
  { id: "recurring" as Tab, label: "Recurrentes", Icon: RefreshCcw },
  { id: "debts"     as Tab, label: "Deudas",      Icon: Handshake },
  { id: "settings"  as Tab, label: "Ajustes",     Icon: Settings },
]

function PageContent({ tab, refreshKey }: { tab: Tab; refreshKey: number }) {
  switch (tab) {
    case "dashboard":  return <Dashboard refreshKey={refreshKey} />
    case "movements":  return <Movements refreshKey={refreshKey} />
    case "recurring":  return <Recurring />
    case "debts":      return <Debts />
    case "settings":   return <SettingsPage />
  }
}

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const firstName = profile?.display_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? ""

  return (
    <div className="flex h-svh bg-zinc-950 text-zinc-50 overflow-hidden">

      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950 shrink-0">
        <div className="px-6 py-8 border-b border-zinc-800">
          <h1 className="text-3xl font-bold tracking-tight">Humo</h1>
          <p className="mt-1 text-sm text-zinc-500">Hola, {firstName}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === id
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-zinc-800">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
          >
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <PageContent tab={activeTab} refreshKey={refreshKey} />
      </main>

      <FAB onClick={() => setModalOpen(true)} />

      <QuickAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
      />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex z-30">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
              activeTab === id ? "text-zinc-50" : "text-zinc-600"
            )}
          >
            <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
      </nav>

    </div>
  )
}
