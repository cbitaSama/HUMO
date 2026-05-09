import { Sheet } from "@/components/Sheet"

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

/** Wrapper de compatibilidad para que los modales viejos sigan funcionando. */
export function SettingsModal({ open, onClose, title, children }: Props) {
  return <Sheet open={open} onClose={onClose} title={title}>{children}</Sheet>
}
