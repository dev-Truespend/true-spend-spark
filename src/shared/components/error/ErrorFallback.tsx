import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    resetError();
    navigate('/');
  };

  const handleReload = () => {
    resetError();
    window.location.reload();
  };

  // Don't show stack traces in production
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            We're sorry, but something unexpected happened. Your data is safe.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription>
              {error.message || 'An unknown error occurred'}
            </AlertDescription>
          </Alert>

          {isDev && error.stack && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical Details (Development Only)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto max-h-60">
                <code>{error.stack}</code>
              </pre>
            </details>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your session is still protected. Refresh the page or try again in a moment.
            </p>
            <p className="text-sm text-muted-foreground">
              You can try:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Refreshing the page</li>
              <li>Going back to the home page</li>
              <li>Checking your internet connection</li>
              <li>Clearing your browser cache</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={handleReload} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="flex-1">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
