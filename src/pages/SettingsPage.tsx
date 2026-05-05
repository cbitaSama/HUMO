import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { cn, formatBs } from "@/lib/utils"
import { avatarGradient, initials } from "@/lib/avatar"
import { exportTransactionsCsv } from "@/lib/csv"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Mail, KeyRound, Coins, Flame, Users, UserPlus, Landmark,
  Download, RotateCcw, LogOut, ChevronRight, Pencil, Sparkles,
} from "lucide-react"
import { NameModal } from "@/components/settings/NameModal"
import { EmailModal } from "@/components/settings/EmailModal"
import { PasswordModal } from "@/components/settings/PasswordModal"
import { HumoThresholdModal } from "@/components/settings/HumoThresholdModal"
import { ResetAccountModal } from "@/components/settings/ResetAccountModal"

type Variant = "default" | "warning" | "danger"

function Row({
  icon: Icon, label, value, badge, variant = "default", onClick, disabled,
}: {
  icon: any
  label: string
  value?: string
  badge?: string
  variant?: Variant
  onClick?: () => void
  disabled?: boolean
}) {
  const colors = {
    default: "text-zinc-100 hover:bg-zinc-800/60",
    warning: "text-amber-400 hover:bg-amber-500/10",
    danger:  "text-red-400 hover:bg-red-500/10",
  }
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { x: 2 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-4 transition-colors text-left",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        colors[variant]
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      {badge && (
        <span className="text-[10px] uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
      {value && <span className="text-xs text-zinc-500 truncate max-w-[40%]">{value}</span>}
      {onClick && !disabled && <ChevronRight size={14} className="text-zinc-600 shrink-0" />}
    </motion.button>
  )
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em] mb-2 px-1">
          {title}
        </p>
      )}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden divide-y divide-zinc-800/80">
        {children}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const [refreshKey, setRefreshKey] = useState(0)
  const [counts, setCounts] = useState({ payers: 0, txs: 0 })

  const [nameOpen, setNameOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [passOpen, setPassOpen] = useState(false)
  const [humoOpen, setHumoOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from("payers").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabase.from("transactions").select("id", { count: "exact", head: true }),
    ]).then(([p, t]) => {
      setCounts({ payers: p.count ?? 0, txs: t.count ?? 0 })
    })
  }, [user, refreshKey])

  // Guard: si todavía no hay user, mostrar placeholder en vez de crashear
  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto md:max-w-3xl md:p-8">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Ajustes</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-2xl shimmer bg-zinc-900/60" />
          ))}
        </div>
      </div>
    )
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? ""
  const email = user.email ?? ""
  const [c1, c2] = avatarGradient(displayName || email)
  const humoT = Number(profile?.humo_threshold_bs ?? 20)

  async function handleExport() {
    setExporting(true)
    try { await exportTransactionsCsv() }
    finally { setExporting(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto md:max-w-3xl md:p-8 space-y-6 pb-12">

      <h2 className="text-2xl font-bold tracking-tight">Ajustes</h2>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6 overflow-hidden"
      >
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${c1}, transparent 70%)` }}
        />
        <div className="flex items-center gap-4 relative">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            {initials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 mb-0.5">Hola</p>
            <h3 className="text-2xl font-bold tracking-tight truncate">{displayName}</h3>
            <p className="text-sm text-zinc-500 truncate">{email}</p>
          </div>
          <motion.button
            onClick={() => setNameOpen(true)}
            whileHover={{ scale: 1.06, rotate: -8 }}
            whileTap={{ scale: 0.92 }}
            className="p-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-zinc-50 transition-colors shrink-0"
            title="Editar nombre"
          >
            <Pencil size={14} />
          </motion.button>
        </div>
      </motion.div>

      <Section title="Cuenta">
        <Row icon={Mail}     label="Email"      value={email}     onClick={() => setEmailOpen(true)} />
        <Row icon={KeyRound} label="Contraseña" value="••••••••" onClick={() => setPassOpen(true)} />
      </Section>

      <Section title="Preferencias">
        <Row icon={Coins} label="Moneda" value="Bolivianos" badge="v2" disabled />
        <Row
          icon={Flame}
          label="Humbral del Humómetro"
          value={`< ${formatBs(humoT)}`}
          onClick={() => setHumoOpen(true)}
        />
      </Section>

      <Section title="Personas">
        <Row
          icon={Users}
          label="Pagadores"
          value={`${counts.payers} activos`}
          onClick={() => alert("Ya podés gestionarlos desde la pestaña Pagadores")}
        />
        <Row icon={UserPlus} label="Amigos" badge="Próximamente" disabled />
      </Section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        whileHover={{ y: -2 }}
        className="relative rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 overflow-hidden cursor-default"
      >
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/20 flex items-center justify-center">
              <Landmark size={16} className="text-emerald-300" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
              Próximamente
            </span>
          </div>

          <h3 className="text-xl font-bold tracking-tight mb-1.5 flex items-center gap-2">
            Conectá tu banco
            <Sparkles size={16} className="text-amber-300" />
          </h3>

          <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
            Pagá QR desde Humo, recibí cobros con un toque, y que cada movimiento se registre solo. Ganadero, BNB, Sol, BCP — todos los bancos bolivianos vía OpenBCB.
          </p>

          <ul className="space-y-1.5 text-xs text-zinc-500">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              QR para cobrar a amigos y registro automático
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Pago de servicios desde la app
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Splitwise interno: dividís y cobrás en un toque
            </li>
          </ul>
        </div>
      </motion.div>

      <Section title="Datos">
        <Row
          icon={Download}
          label={exporting ? "Exportando..." : "Exportar como CSV"}
          onClick={handleExport}
          disabled={exporting}
          value={`${counts.txs} movimientos`}
        />
      </Section>

      <Section title="Zona peligrosa">
        <Row
          icon={RotateCcw}
          label="Restablecer cuenta"
          variant="warning"
          onClick={() => setResetOpen(true)}
        />
      </Section>

      <Section>
        <Row
          icon={LogOut}
          label="Cerrar sesión"
          variant="danger"
          onClick={() => supabase.auth.signOut()}
        />
      </Section>

      <p className="text-center text-[11px] text-zinc-700 pt-4">
        Humo · v1.0 · Hecho en Bolivia 🇧🇴
      </p>

      <NameModal
        open={nameOpen} onClose={() => setNameOpen(false)}
        current={displayName} userId={user.id}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
      <EmailModal
        open={emailOpen} onClose={() => setEmailOpen(false)}
        current={email}
      />
      <PasswordModal
        open={passOpen} onClose={() => setPassOpen(false)}
        email={email}
      />
      <HumoThresholdModal
        open={humoOpen} onClose={() => setHumoOpen(false)}
        current={humoT} userId={user.id}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
      <ResetAccountModal
        open={resetOpen} onClose={() => setResetOpen(false)}
        email={email}
        onReset={() => setRefreshKey(k => k + 1)}
      />

    </div>
  )
}
