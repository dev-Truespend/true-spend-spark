import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type ConfirmStatus = 'verifying' | 'success' | 'invalid' | 'expired';

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmStatus>('verifying');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      setMessage('No verification token provided');
      return;
    }

    confirmEmailChange(token);
  }, [searchParams]);

  const confirmEmailChange = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-email-change', {
        body: { token },
      });

      if (error) {
        if (error.message?.includes('expired')) {
          setStatus('expired');
          setMessage('This link has expired. Please request a new email change.');
        } else {
          setStatus('invalid');
          setMessage('This link is invalid or has already been used.');
        }
        return;
      }

      setStatus('success');
      setNewEmail(data.newEmail);
      setMessage('Your email has been changed successfully!');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (err: any) {
      console.error('Email change confirmation error:', err);
      setStatus('invalid');
      setMessage('An error occurred during email change confirmation.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          )}
          {(status === 'invalid' || status === 'expired') && (
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
          
          <CardTitle className="text-2xl">
            {status === 'verifying' && 'Confirming Email Change...'}
            {status === 'success' && 'Email Changed!'}
            {status === 'invalid' && 'Invalid Link'}
            {status === 'expired' && 'Link Expired'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && newEmail && (
            <>
              <p className="text-sm text-primary font-medium">
                Your new email: {newEmail}
              </p>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}
          
          {status === 'expired' && (
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          )}
          
          {status === 'invalid' && (
            <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
              Go to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
