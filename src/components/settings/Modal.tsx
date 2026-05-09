import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { modalBackdrop } from "@/lib/motion"
import { cn } from "@/lib/utils"

const sheetMobile = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 36 } },
  exit:    { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
}

const sheetDesktop = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 380, damping: 34 } },
  exit:    { opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.2 } },
}

function useIsDesktop() {
  const [isDesktop, set] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = (e: MediaQueryListEvent) => set(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return isDesktop
}

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function SettingsModal({ open, onClose, title, children }: Props) {
  const isDesktop = useIsDesktop()

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
            variants={isDesktop ? sheetDesktop : sheetMobile}
            initial="initial" animate="animate" exit="exit"
            onClick={e => e.stopPropagation()}
            className={cn(
              "w-full md:max-w-md bg-zinc-950 border-zinc-800 flex flex-col",
              "md:border md:rounded-2xl md:max-h-[85vh]",
              "rounded-t-3xl border-t",
              "max-h-[92vh]"
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>
            <div className="flex items-center justify-between px-6 py-4 shrink-0">
              <h2 className="text-lg font-semibold">{title}</h2>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
