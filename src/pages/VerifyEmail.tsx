import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type VerificationStatus = 'verifying' | 'success' | 'invalid' | 'expired' | 'deleted';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { token },
      });

      if (error) {
        const errorData = typeof error === 'string' ? { error } : error;
        if (errorData.error?.includes('account_deleted') || errorData.message?.includes('account_deleted')) {
          setStatus('deleted');
          setMessage('This verification link has expired and the account has been removed. Please sign up again.');
        } else if (errorData.error?.includes('expired') || errorData.message?.includes('expired')) {
          setStatus('expired');
          setMessage('This verification link has expired. Please request a new verification email.');
        } else {
          setStatus('invalid');
          setMessage('This verification link is invalid or has already been used.');
        }
        return;
      }

      setStatus('success');
      setMessage('Your email has been verified successfully! Please log in to continue.');

    } catch (err: any) {
      console.error('Verification error:', err);
      setStatus('invalid');
      setMessage('An error occurred during verification.');
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to resend verification email');
        navigate('/auth');
        return;
      }

      const { error } = await supabase.functions.invoke('send-verification-email', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const errorMsg = error.message || 'Failed to resend verification email';
        if (errorMsg.includes('Rate limit exceeded')) {
          toast.error(errorMsg);
        } else if (errorMsg.includes('already verified')) {
          toast.info('Your email is already verified!');
          navigate('/auth');
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsResending(false);
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
          {(status === 'invalid' || status === 'expired' || status === 'deleted') && (
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
          
          <CardTitle className="text-2xl">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'invalid' && 'Invalid Link'}
            {status === 'expired' && 'Link Expired'}
            {status === 'deleted' && 'Account Deleted'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          )}
          
          {(status === 'expired' || status === 'invalid') && (
            <div className="space-y-2">
              <Button 
                onClick={handleResendVerification} 
                disabled={isResending}
                className="w-full"
              >
                {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend Verification Email
              </Button>
              <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                Go to Login
              </Button>
            </div>
          )}
          
          {status === 'deleted' && (
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign Up Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
