import { Plus } from "lucide-react"

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed z-40 bottom-20 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-zinc-50 text-zinc-950 flex items-center justify-center shadow-2xl shadow-black/40 active:scale-95 transition-transform"
      aria-label="Nuevo movimiento"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  )
}
