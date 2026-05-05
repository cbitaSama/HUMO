import { AuthPage } from "@/pages/Auth"
import { Dashboard } from "@/pages/Dashboard"
import { useAuth } from "@/hooks/useAuth"

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-500">
        ...
      </div>
    )
  }

  return session ? <Dashboard /> : <AuthPage />
}

export default App
