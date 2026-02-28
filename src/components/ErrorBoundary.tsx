import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      )
    }
    return this.props.children
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="relative max-w-lg overflow-hidden border-2 shadow-xl">
        {/* Whimsical "confetti" dots */}
        <div className="absolute right-4 top-4 flex gap-1 opacity-60">
          <span className="bg-chart-1 size-2 animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
          <span className="bg-chart-3 size-2 animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
          <span className="bg-chart-5 size-2 animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 text-destructive flex size-14 shrink-0 items-center justify-center rounded-2xl">
              <AlertTriangle className="size-8" strokeWidth={2} />
            </div>
            <div>
              <CardTitle className="text-xl">Whoops! The schedule got tangled</CardTitle>
              <p className="text-muted-foreground text-sm">
                Something fumbled in the playbook. The league officials are on it.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Don&apos;t worry — your divisions are safe. Give it another shot and we&apos;ll get you back on the
            field.
          </p>
          <details className="group">
            <summary className="text-muted-foreground cursor-pointer text-xs hover:text-foreground">
              What went wrong?
            </summary>
            <pre className="bg-muted mt-2 max-h-32 overflow-auto rounded-lg p-3 text-xs">
              {error.message}
            </pre>
          </details>
        </CardContent>

        <CardFooter>
          <button
            type="button"
            onClick={onRetry}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
        </CardFooter>
      </Card>
    </div>
  )
}
