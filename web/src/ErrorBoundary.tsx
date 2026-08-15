import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = {
  children: ReactNode
  /** Storage keys dropped by the recovery action, so a poisoned setting cannot brick the next launch. */
  resetKeys: string[]
}

type State = { error: Error | null }

/**
 * Without this, a render or effect failure leaves an empty root: on Android that is an
 * unrecoverable black screen, because the saved configuration reproduces the crash on
 * every launch and the only way out is clearing the app data.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Harness Remote crashed", error, info.componentStack)
  }

  #resetSettings = () => {
    for (const key of this.props.resetKeys) localStorage.removeItem(key)
    location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="crash-screen" role="alert">
        <h1>Harness Remote could not start</h1>
        <p>
          Something went wrong while loading the app. Resetting the server settings clears the saved
          configuration and reloads; your language and theme are kept.
        </p>
        <pre>{error.message}</pre>
        <div className="crash-actions">
          <button type="button" className="btn-primary" onClick={this.#resetSettings}>
            Reset server settings
          </button>
          <button type="button" className="btn-secondary" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
