import { Component, type ReactNode } from "react"

type State = { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("React error:", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-svh bg-zinc-950 text-zinc-50 p-6 font-mono text-xs overflow-auto">
          <h1 className="text-red-400 text-lg mb-4 font-bold">Algo se rompió</h1>
          <p className="text-red-300 mb-2">{this.state.error.message}</p>
          <pre className="text-zinc-500 whitespace-pre-wrap break-words">
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => location.reload()}
            className="mt-6 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-lg font-sans text-sm font-semibold"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
