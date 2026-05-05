import { cn } from "@/lib/utils"
import { Handshake, Users, X } from "lucide-react"
import { useEffect } from "react"

type Props = {
  open: boolean
  onClose: () => void
  onPick: (mode: "individual" | "group") => void
}

export function DebtChooser({ open, onClose, onPick }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full md:max-w-md bg-zinc-950 border-t md:border border-zinc-800 md:rounded-2xl rounded-t-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">¿Qué tipo de deuda?</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 active:scale-90 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => onPick("individual")}
            className={cn(
              "w-full text-left p-5 rounded-2xl border transition-all active:scale-[0.98]",
              "border-zinc-800 bg-zinc-900 hover:border-purple-500/40 hover:bg-purple-500/5"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <Handshake size={22} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-zinc-50">Préstamo</p>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Le diste o te dieron plata directa. Una persona.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onPick("group")}
            className={cn(
              "w-full text-left p-5 rounded-2xl border transition-all active:scale-[0.98]",
              "border-zinc-800 bg-zinc-900 hover:border-emerald-500/40 hover:bg-emerald-500/5"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Users size={22} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-zinc-50">Gasto compartido</p>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Pagaste algo y varios amigos te lo deben. Tickeás cada uno cuando paga.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
