import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, ArrowLeftRight, RefreshCcw, Users, Handshake,
  Settings, LogOut, MoreHorizontal, X,
} from "lucide-react"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { pageVariants, easeOut, modalBackdrop, modalSheet } from "@/lib/motion"
import { Dashboard } from "@/pages/Dashboard"
import { Movements } from "@/pages/Movements"
import { Recurring } from "@/pages/Recurring"
import { Payers } from "@/pages/Payers"
import { Debts } from "@/pages/Debts"
import { SettingsPage } from "@/pages/SettingsPage"
import { FAB } from "@/components/quick-add/FAB"
import { QuickAddModal } from "@/components/quick-add/QuickAddModal"

type Tab = "dashboard" | "movements" | "recurring" | "payers" | "debts" | "settings"

const tabs = [
  { id: "dashboard" as Tab, label: "Inicio",      shortLabel: "Inicio",  Icon: LayoutDashboard },
  { id: "movements" as Tab, label: "Movimientos", shortLabel: "Mov.",    Icon: ArrowLeftRight },
  { id: "recurring" as Tab, label: "Recurrentes", shortLabel: "Auto",    Icon: RefreshCcw },
  { id: "payers"    as Tab, label: "Pagadores",   shortLabel: "Pagad.",  Icon: Users },
  { id: "debts"     as Tab, label: "Deudas",      shortLabel: "Deudas",  Icon: Handshake },
  { id: "settings"  as Tab, label: "Ajustes",     shortLabel: "Más",     Icon: Settings },
]

const mobileMain: Tab[] = ["dashboard", "movements", "payers", "debts"]

function PageContent({ tab, refreshKey }: { tab: Tab; refreshKey: number }) {
  switch (tab) {
    case "dashboard": return <Dashboard refreshKey={refreshKey} />
    case "movements": return <Movements refreshKey={refreshKey} />
    case "recurring": return <Recurring />
    case "payers":    return <Payers />
    case "debts":     return <Debts />
    case "settings":  return <SettingsPage />
  }
}

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [modalOpen, setModalOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const firstName = profile?.display_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? ""

  function pickTab(t: Tab) {
    setActiveTab(t)
    setMoreOpen(false)
  }

  return (
    <div className="flex h-svh bg-zinc-950 text-zinc-50 overflow-hidden">

      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950 shrink-0 relative">
        {/* sutil glow ambiental detrás del logo */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-orange-500/[0.04] to-transparent pointer-events-none" />

        <div className="px-6 py-8 border-b border-zinc-800 relative">
          <h1 className="text-3xl font-bold tracking-tight">Humo</h1>
          <p className="mt-1 text-sm text-zinc-500">Hola, {firstName}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map(({ id, label, Icon }) => (
            <motion.button
              key={id}
              onClick={() => pickTab(id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors relative",
                activeTab === id
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
              )}
            >
              {activeTab === id && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl bg-zinc-800 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon size={18} />
              {label}
            </motion.button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-zinc-800">
          <motion.button
            onClick={() => supabase.auth.signOut()}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
          >
            <LogOut size={18} />
            Salir
          </motion.button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={easeOut}
          >
            <PageContent tab={activeTab} refreshKey={refreshKey} />
          </motion.div>
        </AnimatePresence>
      </main>

      <FAB onClick={() => setModalOpen(true)} />

      <QuickAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
      />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex z-30">
        {tabs.filter(t => mobileMain.includes(t.id)).map(({ id, shortLabel, Icon }) => (
          <motion.button
            key={id}
            onClick={() => pickTab(id)}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors relative",
              activeTab === id ? "text-zinc-50" : "text-zinc-600"
            )}
          >
            {activeTab === id && (
              <motion.div
                layoutId="mobileTabActive"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-zinc-50 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            {shortLabel}
          </motion.button>
        ))}
        <motion.button
          onClick={() => setMoreOpen(true)}
          whileTap={{ scale: 0.92 }}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
            (activeTab === "recurring" || activeTab === "settings") ? "text-zinc-50" : "text-zinc-600"
          )}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          Más
        </motion.button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end"
            variants={modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              variants={modalSheet}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg font-semibold">Más</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMoreOpen(false)} className="text-zinc-500">
                  <X size={20} />
                </motion.button>
              </div>
              <nav className="px-3 pb-6 space-y-1">
                {tabs.filter(t => !mobileMain.includes(t.id)).map(({ id, label, Icon }) => (
                  <motion.button
                    key={id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => pickTab(id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium transition-colors",
                      activeTab === id ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900"
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { supabase.auth.signOut(); setMoreOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium text-red-400 hover:bg-zinc-900 transition-colors mt-2"
                >
                  <LogOut size={18} />
                  Salir
                </motion.button>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
