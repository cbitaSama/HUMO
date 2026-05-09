import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
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

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
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
  footer?: React.ReactNode
}

/**
 * Sheet — bottom sheet en mobile, modal centrado en desktop.
 * Usa createPortal a document.body para escapar el flow del DOM
 * y NO heredar limitaciones de altura/overflow del padre.
 */
export function Sheet({ open, onClose, title, children, footer }: Props) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (typeof document === "undefined") return null

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={backdropVariants}
          initial="initial" animate="animate" exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{ height: "100dvh" }}
        >
          <motion.div
            variants={isDesktop ? sheetDesktop : sheetMobile}
            initial="initial" animate="animate" exit="exit"
            onClick={e => e.stopPropagation()}
            className={cn(
              "w-full md:max-w-md bg-zinc-950 border-zinc-800 flex flex-col",
              "md:border md:rounded-2xl md:max-h-[85vh]",
              "rounded-t-3xl border-t",
              "max-h-[92dvh]"
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-zinc-900">
              <h2 className="text-lg font-semibold">{title}</h2>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 min-h-0">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 px-6 pt-3 pb-5 border-t border-zinc-900 bg-zinc-950">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
