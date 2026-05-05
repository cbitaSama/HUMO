import { cn } from "@/lib/utils"

export function Splash({ exiting = false }: { exiting?: boolean }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 overflow-hidden",
        "transition-[opacity,transform,filter] duration-[750ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
        exiting
          ? "opacity-0 scale-[1.04] blur-[6px]"
          : "opacity-100 scale-100 blur-0"
      )}
      aria-hidden={exiting}
    >
      {/* Glow ambiental — desaparece más lento */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-[1100ms] ease-out",
          exiting ? "opacity-0" : "opacity-100"
        )}
      >
        <div
          className="absolute top-1/3 left-1/2 w-[700px] h-[700px] rounded-full bg-orange-500/25"
          style={{
            filter: "blur(140px)",
            animation: "glowBreath 4s ease-in-out infinite",
            transform: "translate(-50%, 0)",
          }}
        />
      </div>

      {/* Vignette sutil para profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      {/* Contenido */}
      <div className="relative flex flex-col items-center">
        <h1
          className="text-7xl font-bold text-zinc-50"
          style={{
            animation: "logoIn 950ms cubic-bezier(0.32, 0.72, 0, 1) both",
          }}
        >
          Humo
        </h1>

        {/* Línea de humo subiendo */}
        <div className="mt-6 relative h-12 w-px overflow-hidden opacity-70">
          <div
            className="absolute inset-0 bg-gradient-to-t from-transparent via-orange-400/80 to-transparent"
            style={{ animation: "smoke 2.4s ease-in-out infinite" }}
          />
        </div>

        <p
          className="mt-2 text-[10px] uppercase text-zinc-500 font-medium"
          style={{
            animation: "subIn 700ms cubic-bezier(0.32, 0.72, 0, 1) 380ms both",
          }}
        >
          Cuidando tus centavos
        </p>
      </div>
    </div>
  )
}
