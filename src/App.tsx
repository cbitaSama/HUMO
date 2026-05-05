import { AuthPage } from "@/pages/Auth"
import { AppLayout } from "@/components/layout/AppLayout"
import { Splash } from "@/components/Splash"
import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState } from "react"

type Phase = "splash" | "exiting" | "app"

function App() {
  const { session, loading } = useAuth()
  const [phase, setPhase] = useState<Phase>("splash")

  useEffect(() => {
    if (loading) return
    // Mínimo de splash para que la animación de entrada se aprecie
    const t1 = setTimeout(() => setPhase("exiting"), 1100)
    // Para cuando llegamos a "app", el splash ya completó su fade-out
    const t2 = setTimeout(() => setPhase("app"), 1850)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [loading])

  return (
    <>
      {phase !== "app" && <Splash exiting={phase === "exiting"} />}

      {phase !== "splash" && (
        <div
          className="min-h-svh"
          style={{
            animation: "contentIn 900ms cubic-bezier(0.32, 0.72, 0, 1) both",
            pointerEvents: phase === "app" ? "auto" : "none",
          }}
        >
          {session ? <AppLayout /> : <AuthPage />}
        </div>
      )}
    </>
  )
}

export default App
