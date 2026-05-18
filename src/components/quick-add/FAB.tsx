import { Plus } from "lucide-react"
import { motion } from "framer-motion"

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      className="fixed z-40 right-5 md:!bottom-8 md:right-8 w-14 h-14 rounded-full bg-zinc-50 text-zinc-950 flex items-center justify-center shadow-2xl shadow-black/50 ring-1 ring-black/5"
      aria-label="Nuevo movimiento"
    >
      <Plus size={26} strokeWidth={2.5} />
    </motion.button>
  )
}
