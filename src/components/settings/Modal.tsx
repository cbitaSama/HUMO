import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect } from "react"
import { modalBackdrop, modalSheet } from "@/lib/motion"

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function SettingsModal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalBackdrop} initial="initial" animate="animate" exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            variants={modalSheet} initial="initial" animate="animate" exit="exit"
            onClick={e => e.stopPropagation()}
            className="w-full md:max-w-md bg-zinc-950 border-t md:border border-zinc-800 md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="md:hidden flex justify-center pt-3">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
