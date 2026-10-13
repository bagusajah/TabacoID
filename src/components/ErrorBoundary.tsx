import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="layout-grid flex min-h-[50vh] items-center py-16" role="alert">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Something went wrong.</h1>
          <p className="text-base leading-7 text-slate-600">
            This page failed to render. Reloading usually fixes it.
          </p>
          <button className="button-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </section>
    )
  }
}
