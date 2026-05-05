import { Plus } from "lucide-react"
import { motion } from "framer-motion"

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className="fixed z-40 bottom-20 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-zinc-50 text-zinc-950 flex items-center justify-center shadow-2xl shadow-black/40"
      aria-label="Nuevo movimiento"
    >
      <Plus size={26} strokeWidth={2.5} />
      {/* Subtle ring on hover */}
      <span className="absolute inset-0 rounded-full ring-1 ring-white/0 group-hover:ring-white/20 transition" />
    </motion.button>
  )
}
