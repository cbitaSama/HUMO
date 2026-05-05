import { supabase } from "@/lib/supabase"
import { useState } from "react"

function validatePassword(p: string): string | null {
  if (p.length < 8) return "Mínimo 8 caracteres"
  if (!/[A-Z]/.test(p)) return "Debe tener al menos una mayúscula"
  if (!/[0-9]/.test(p)) return "Debe tener al menos un número"
  return null
}

export function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === "signup") {
      const pwError = validatePassword(password)
      if (pwError) return setError(pwError)
      if (password !== confirm) return setError("Las contraseñas no coinciden")
    }

    setLoading(true)

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : error.message
      )
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo("Revisá tu email para confirmar tu cuenta.")
    }

    setLoading(false)
  }

  function switchMode() {
    setMode(m => m === "signin" ? "signup" : "signin")
    setError(null)
    setInfo(null)
    setPassword("")
    setConfirm("")
  }

  const pwStrength = password.length === 0 ? null :
    validatePassword(password) === null ? "strong" :
    password.length >= 4 ? "medium" : "weak"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <div className="w-full max-w-sm">

        <div className="mb-10 text-center">
          <h1 className="text-7xl font-bold tracking-tight">Humo</h1>
          <p className="mt-2 text-sm text-zinc-500">
            No dejes que tu plata se haga humo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
              autoComplete="email"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-zinc-600 transition-colors"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "Mín. 8 chars, 1 mayúscula, 1 número" : ""}
            />
            {mode === "signup" && password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {["weak","medium","strong"].map((level, i) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      pwStrength === "weak" && i === 0 ? "bg-red-500" :
                      pwStrength === "medium" && i <= 1 ? "bg-yellow-500" :
                      pwStrength === "strong" ? "bg-emerald-500" :
                      "bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-zinc-400">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={`mt-1 w-full rounded-xl border bg-zinc-900 px-4 py-3 text-base outline-none transition-colors ${
                  confirm.length > 0 && confirm !== password
                    ? "border-red-800 focus:border-red-600"
                    : "border-zinc-800 focus:border-zinc-600"
                }`}
                autoComplete="new-password"
                placeholder="Repetí tu contraseña"
              />
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl bg-emerald-950 border border-emerald-900 px-4 py-3 text-sm text-emerald-400">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-50 py-3 text-base font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? "..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          onClick={switchMode}
          className="mt-6 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {mode === "signin"
            ? "¿No tenés cuenta? Crear una"
            : "¿Ya tenés cuenta? Entrar"}
        </button>

      </div>
    </div>
  )
}
