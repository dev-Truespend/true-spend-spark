import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service via edge function
    if (typeof window !== 'undefined') {
      try {
        const requestId = crypto.randomUUID();
        
        // Send to log-collector edge function (fire-and-forget)
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-collector`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-request-id': requestId,
          },
          body: JSON.stringify({
            level: 'critical',
            component: 'ErrorBoundary',
            message: error.message,
            request_id: requestId,
            stack_trace: error.stack,
            user_agent: navigator.userAgent,
            metadata: {
              componentStack: errorInfo.componentStack,
              route: window.location.pathname,
            },
          }),
        }).catch((logError) => {
          // Silent failure - logging should never break the app
          if (import.meta.env.DEV) {
            console.error('Failed to send error to log-collector:', logError);
          }
        });
      } catch (logError) {
        // Silent failure - logging should never break the app
        if (import.meta.env.DEV) {
          console.error('Failed to log error:', logError);
        }
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-lg w-full border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-48">
                  <p className="text-destructive font-semibold mb-2">
                    {this.state.error.message}
                  </p>
                  <pre className="whitespace-pre-wrap text-muted-foreground">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
