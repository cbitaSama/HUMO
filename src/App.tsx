import { AuthPage } from "@/pages/Auth"
import { AppLayout } from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
        ...
      </div>
    )
  }

  return session ? <AppLayout /> : <AuthPage />
}

export default App
