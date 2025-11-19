import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
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

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to telemetry if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.storage.local.get('settings', (result) => {
        if (result.settings?.telemetryEnabled) {
          chrome.runtime.sendMessage({
            type: 'TELEMETRY_EVENT',
            data: {
              event: 'extension_error',
              properties: {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
              },
            },
          });
        }
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Reload the extension popup/page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-96 h-[500px] p-4 flex items-center justify-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The extension encountered an error. This has been logged for investigation.
              </p>
              
              {this.state.error && (
                <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}

              <Button 
                onClick={this.handleReset} 
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Extension
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                If this persists, try disabling and re-enabling the extension
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
