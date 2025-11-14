import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: 'pending_verification' | 'active' | 'deleted';
  verification_expires_at: string | null;
  email_verified_at: string | null;
  auth_provider: string | null;
}

interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: any; requiresMFA?: boolean; userId?: string }>;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<{ error: any }>;
  requestPasswordReset: (email: string) => Promise<{ error: any; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ error: any }>;
  checkAuthProvider: (email: string) => Promise<any>;
  verifyMFACode: (userId: string, code: string) => Promise<{ error: any }>;
  verifyBackupCode: (userId: string, code: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch profile whenever user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          // Cast to any to bypass stale TypeScript types
          const profile = data as any;
          setProfile({
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name || null,
            last_name: profile.last_name || null,
            status: profile.status as 'pending_verification' | 'active' | 'deleted',
            verification_expires_at: profile.verification_expires_at || null,
            email_verified_at: profile.email_verified_at || null,
            auth_provider: profile.auth_provider || null,
          });
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Step 1: Check if account is locked (BEFORE attempting login)
    try {
      const lockCheckResponse = await supabase.functions.invoke('check-login-attempts', {
        body: { email: email.toLowerCase(), ipAddress: 'web' }
      });

      if (lockCheckResponse.error) {
        throw lockCheckResponse.error;
      }

      if (lockCheckResponse.data?.locked) {
        const lockData = lockCheckResponse.data;
        let remainingTime = '';
        
        if (lockData.lockExpiresAt && !lockData.isEscalated) {
          const expiresAt = new Date(lockData.lockExpiresAt);
          const now = new Date();
          const diffMinutes = Math.ceil((expiresAt.getTime() - now.getTime()) / 60000);
          if (diffMinutes > 0) {
            remainingTime = ` Try again in about ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}.`;
          }
        }

        return { 
          error: { 
            message: lockData.message + remainingTime,
            code: 'account_locked'
          } 
        };
      }
    } catch (lockCheckError) {
      console.error('Lock check failed:', lockCheckError);
      // Continue with login attempt if lock check fails (fail open for better UX)
    }

    // Step 2: Attempt login with Supabase
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Step 3: Record login attempt
    const userId = data?.user?.id || null;
    try {
      await supabase.functions.invoke('record-login-attempt', {
        body: {
          email: email.toLowerCase(),
          success: !error,
          ipAddress: 'web',
          userId,
          metadata: { timestamp: new Date().toISOString() }
        }
      });
    } catch (recordError) {
      console.error('Failed to record login attempt:', recordError);
      // Don't block login if recording fails
    }

    // Step 4: If login failed, return generic error
    if (error) {
      // NEVER reveal specific details about why login failed
      return { 
        error: { 
          message: "We couldn't sign you in with those details. Check your email and password and try again.",
          code: 'invalid_credentials'
        } 
      };
    }

    // Step 5: Check account status and MFA for verified users
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const profile = profileData as any;
      
      // Block deleted accounts
      if (profile?.status === 'deleted') {
        await supabase.auth.signOut();
        return { 
          error: { 
            message: "We couldn't find an account with those details. Check your email or create a new account.",
            code: 'account_not_found'
          } 
        };
      }

      // BLOCK unverified accounts - do NOT allow login
      if (profile?.status === 'pending_verification') {
        await supabase.auth.signOut();
        
        // Check if verification expired
        if (profile.verification_expires_at) {
          const expiry = new Date(profile.verification_expires_at);
          if (expiry < new Date()) {
            return { 
              error: { 
                message: "Your verification link expired. Accounts not verified within 24 hours are automatically deleted. Please create a new account.",
                code: 'verification_expired'
              } 
            };
          }
        }
        
        return { 
          error: { 
            message: `Your account isn't verified yet. Please click the verification link we sent to ${profile.email}. Accounts not verified within 24 hours are deleted automatically.`,
            code: 'account_not_verified'
          } 
        };
      }

      // Check if MFA is enabled
      const { data: mfaSettings } = await supabase
        .from('mfa_settings' as any)
        .select('totp_enabled')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if ((mfaSettings as any)?.totp_enabled) {
        // Sign out and require MFA verification
        await supabase.auth.signOut();
        return { 
          error: null, 
          requiresMFA: true, 
          userId: data.user.id 
        };
      }
    }

    return { error: null };
  };

  const signUp = async (data: SignUpData) => {
    const { error, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        }
      },
    });

    if (error) return { error };

    // Trigger verification email via edge function
    if (authData.user && authData.session) {
      try {
        await supabase.functions.invoke('send-verification-email', {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
          },
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const sendVerificationEmail = async () => {
    if (!session) {
      return { error: { message: 'No active session' } };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      return { error, data };
    } catch (error: any) {
      return { error };
    }
  };

  const checkAuthProvider = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-auth-provider', {
        body: { email: email.toLowerCase().trim() }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Provider check error:', error);
      return null;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: email.toLowerCase().trim() }
      });
      
      // Check response data for Google OAuth error FIRST
      if (data?.error === 'google_oauth_account') {
        // Log the wrong provider attempt
        await supabase.functions.invoke('record-login-attempt', {
          body: {
            email,
            success: false,
            ipAddress: 'unknown',
            metadata: { 
              error_type: 'wrong_provider',
              attempted_method: 'password_reset',
              actual_provider: 'google'
            }
          }
        });
        
        return { 
          error: { 
            message: data.message,
            code: 'google_oauth_account'
          }
        };
      }
      
      if (error) {
        console.error('Password reset error:', error);
      }
      
      return { 
        error: null, 
        message: data?.message || `If an account exists for ${email}, we've sent a password reset link.`
      };
    } catch (error: any) {
      return { 
        error: null,
        message: `If an account exists for ${email}, we've sent a password reset link.`
      };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-password-reset', {
        body: { token, newPassword }
      });

      if (error) throw error;
      
      if (data?.error) {
        return { error: { message: data.error } };
      }

      return { error: null };
    } catch (error: any) {
      return { 
        error: { 
          message: error.message || 'Failed to reset password. The link may have expired.'
        } 
      };
    }
  };

  const verifyMFACode = async (userId: string, code: string) => {
    const { data, error } = await supabase.functions.invoke('mfa-verify-totp', {
      body: { userId, code }
    });
    return data?.valid ? { error: null } : { error: { message: 'Invalid code' } };
  };

  const verifyBackupCode = async (userId: string, code: string) => {
    const { data, error } = await supabase.functions.invoke('mfa-verify-backup-code', {
      body: { userId, code }
    });
    return data?.valid ? { error: null } : { error: { message: 'Invalid backup code' } };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        sendVerificationEmail,
        requestPasswordReset,
        resetPassword,
        checkAuthProvider,
        verifyMFACode,
        verifyBackupCode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
