import { Component, type ReactNode } from 'react';

import { logToDebug } from '@/shared/utils/debugLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    // #region agent log
    logToDebug({
      location: 'ErrorBoundary:componentDidCatch',
      message: 'React Error Caught by Error Boundary',
      data: {
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      hypothesisId: 'HYP_A',
    });
    // #endregion

    this.setState({ errorInfo });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-2xl space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            {this.state.error?.stack && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Error Stack</summary>
                <pre className="mt-2 overflow-auto rounded bg-background p-4 text-xs">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            {this.state.errorInfo?.componentStack && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Component Stack</summary>
                <pre className="mt-2 overflow-auto rounded bg-background p-4 text-xs">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              type="button"
              onClick={() => void window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
