import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/hooks/use-toast";
import { useLogger } from "@/features/observability/hooks/useLogger";
import { clearAuthState } from "@/shared/lib/auth/clearAuthState";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  status: 'pending_verification' | 'active' | 'deleted';
  verification_expires_at: string | null;
  email_verified_at: string | null;
  auth_provider: string | null; // Keep for backward compatibility
  auth_providers: string[]; // NEW: Array of all providers
  onboarding_completed_at: string | null;
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
  mfaPending: boolean;
  signIn: (email: string, password: string, mfaCode?: string, backupCode?: string) => Promise<{ error: any; requiresMFA?: boolean; userId?: string; user?: User }>;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<{ error: any }>;
  requestPasswordReset: (email: string) => Promise<{ error: any; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ error: any }>;
  checkAuthProvider: (email: string) => Promise<any>;
  checkMfaStatus: (email: string) => Promise<{ exists: boolean; hasLocal: boolean; mfaEnabled: boolean; }>;
  verifyMFACode: (userId: string, code: string) => Promise<{ error: any }>;
  verifyBackupCode: (userId: string, code: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: Get landing route based on user role
export async function getLandingRouteForUser(userId: string): Promise<string> {
  try {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const userRoles = roles?.map(r => r.role) || [];
    
    if (userRoles.includes('admin')) {
      return '/admin/dashboard';
    }
    
    return '/dashboard';
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return '/dashboard';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
const [mfaPending, setMfaPending] = useState(false);
const mfaPendingRef = useRef(false);
useEffect(() => { mfaPendingRef.current = mfaPending; }, [mfaPending]);
const navigate = useNavigate();
const { toast } = useToast();
const logger = useLogger();
const queryClient = useQueryClient();

  // Fetch profile with all auth providers
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Profile fetch error:', error);
        }
        
        if (data) {
          // Get all auth providers for this user
          const { data: identities } = await supabase
            .from('auth_identities')
            .select('provider')
            .eq('user_id', user.id);
          
          const providers = identities?.map(i => i.provider) || [];
          
              const profile = data as Record<string, unknown>;
          setProfile({
            id: profile.id as string,
            email: (profile.email as string) || user.email || '',
            first_name: (profile.first_name as string) || null,
            last_name: (profile.last_name as string) || null,
            full_name: (profile.full_name as string) || null,
            status: profile.status as 'pending_verification' | 'active' | 'deleted',
            verification_expires_at: (profile.verification_expires_at as string) || null,
            email_verified_at: (profile.email_verified_at as string) || null,
            auth_provider: (profile.auth_provider as string) || null,
            auth_providers: providers,
            onboarding_completed_at: (profile.onboarding_completed_at as string) || null,
          });
        } else if (user) {
          // Fallback to auth user data if profile doesn't exist yet
          setProfile({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || user.user_metadata?.given_name || null,
            last_name: user.user_metadata?.last_name || user.user_metadata?.family_name || null,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            status: 'active',
            verification_expires_at: null,
            email_verified_at: user.email_confirmed_at || null,
            auth_provider: user.app_metadata?.provider || 'email',
            auth_providers: [user.app_metadata?.provider || 'email'],
            onboarding_completed_at: null,
          });

          // Retry after 1 second in case profile is being created by trigger
          setTimeout(() => fetchProfile(), 1000);
        }
      } else {
        setProfile(null);
      }
    };
    fetchProfile();
  }, [user]);

  // Listen to auth state changes - NO REDIRECTS HERE
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mfaPendingRef.current) {
        return;
      }

      // Google-specific validation — runs before state is committed
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = session.user;
        const provider = authUser.app_metadata?.provider;

        if (provider === 'google') {
          if (import.meta.env.DEV) {
            console.log('Google sign-in detected, validating email');
          }

          if (!authUser.email) {
            // Sign out and surface error — the SIGNED_OUT event will clear state
            await supabase.auth.signOut();
            toast({
              title: "Sign-In Failed",
              description: "No email found from Google. Please try again.",
              variant: "destructive",
            });
            return; // state will be reset when the resulting SIGNED_OUT fires
          }

          // ── Profile status enforcement for OAuth ─────────────────────
          // Password sign-in checks status in `signIn()`. OAuth bypasses that
          // path entirely (Supabase handles the redirect callback), so we
          // must enforce the same rules here — otherwise a deleted user
          // could log back in via Google.
          try {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('status')
              .eq('id', authUser.id)
              .maybeSingle();

            const status = (profileRow as { status?: string } | null)?.status;
            if (status === 'deleted') {
              await supabase.auth.signOut();
              toast({
                title: 'Account closed',
                description: 'This account has been deleted. Contact support if you believe this is a mistake.',
                variant: 'destructive',
              });
              return;
            }
          } catch (err) {
            console.error('[useAuth] OAuth profile status check failed:', err);
            // Fail open — don't lock out users on transient DB errors.
          }

          if (import.meta.env.DEV) {
            console.log('Google sign-in successful - Auth page will handle redirect');
          }

          // Non-blocking audit log
          supabase.functions.invoke('audit-google-login', {
            body: {
              eventType: 'google_login_success',
              success: true,
              reason: null,
              ipAddress: null,
              userAgent: navigator.userAgent,
            },
          }).catch(err => console.error('Error logging Google login:', err));
        }
      }

      // ── Token refresh failure → forced logout ─────────────────────────
      // If Supabase couldn't refresh the access token (refresh token
      // expired, revoked, or rotated by another tab), it emits SIGNED_OUT
      // with no session. Treat this as a session-expired event so the
      // user lands on /auth instead of seeing a stale UI.
      if (event === 'SIGNED_OUT') {
        // Non-blocking security log
        setTimeout(async () => {
          try {
            await supabase.from('security_logs').insert({
              event_type: 'logout',
              severity: 'info',
              details: {
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
              },
            });
          } catch (err) {
            console.error('Failed to log logout:', err);
          }
        }, 0);

        // Drop cached queries — prevents a logged-out tab from showing
        // the previous user's data on subsequent re-login.
        try { queryClient.clear(); } catch { /* non-fatal */ }
      }

      // Single state update — one render per auth event
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient, toast]);

  // ── Live profile revocation ─────────────────────────────────────────────
  // Subscribe to the user's profile row. If an admin (or the user from
  // another device) flips status to 'deleted', force a sign-out so the
  // session can't continue with stale auth.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          const newStatus = (payload.new as { status?: string } | null)?.status;
          if (newStatus === 'deleted') {
            toast({
              title: 'Session ended',
              description: 'Your account has been closed. You have been signed out.',
              variant: 'destructive',
            });
            // Trigger the centralised logout flow
            clearAuthState({ queryClient });
            await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
            window.location.href = '/auth';
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);

  const signIn = async (email: string, password: string, mfaCode?: string, backupCode?: string) => {
    try {
      if (!email || !password) {
        return {
          error: {
            message: "Email and password are required"
          }
        };
      }

      // Step 1: Check authentication provider for this email
      const providerCheck = await checkAuthProvider(email);
      
      if (!providerCheck) {
        return {
          error: {
            message: "No account found with this email"
          }
        };
      }

      // Step 2: Check if account is locked
      try {
        const lockCheckResponse = await supabase.functions.invoke('check-login-attempts', {
          body: { email: email.toLowerCase(), ipAddress: 'web' }
        });

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
      }

      // Step 3: Check if user has local auth
      if (!providerCheck.hasLocal) {
        if (providerCheck.hasGoogle) {
          return {
            error: {
              message: "This email is registered with Google. Please use 'Sign in with Google'."
            }
          };
        }
        return {
          error: {
            message: "No account found with this email. Please sign up first."
          }
        };
      }

      // Step 4: MFA is enabled for local auth - require MFA code or backup code
      if (providerCheck.mfaEnabled) {
        if ((!mfaCode || mfaCode.trim() === '') && (!backupCode || backupCode.trim() === '')) {
          setMfaPending(true);
          return {
            error: null,
            requiresMFA: true
          };
        }

        // Handle backup code verification
        if (backupCode && backupCode.trim()) {
          const { data: backupVerifyData, error: backupVerifyError } = await supabase.functions.invoke(
            'mfa-verify-backup-code',
            {
              body: { userId: providerCheck.userId, code: backupCode.trim().toUpperCase() }
            }
          );

          if (backupVerifyError || !backupVerifyData?.valid) {
            // Increment login failure counter
            try {
              await supabase.functions.invoke('increment-login-failures', {
                body: { userId: providerCheck.userId }
              });
            } catch (incrementError) {
              console.error('Failed to increment login failures:', incrementError);
            }
            
            return {
              error: {
                message: backupVerifyData?.error || "Invalid or used backup code",
                code: 'mfa_invalid'
              }
            };
          }
        } else if (mfaCode && mfaCode.trim()) {
          // Verify TOTP code BEFORE password authentication
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'mfa-verify-totp',
            {
              body: { userId: providerCheck.userId, code: mfaCode }
            }
          );

          if (verifyError || !verifyData?.valid) {
            // Increment login failure counter
            try {
              await supabase.functions.invoke('increment-login-failures', {
                body: { userId: providerCheck.userId }
              });
            } catch (incrementError) {
              console.error('Failed to increment login failures:', incrementError);
            }
            
            return {
              error: {
                message: "Invalid credentials or verification code",
                code: 'mfa_invalid'
              }
            };
          }
        }
      }

      // Step 5: Proceed with password authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Step 6: Record login attempt
      const userId = authData?.user?.id || null;
      try {
        await supabase.functions.invoke('record-login-attempt', {
          body: {
            email: email.toLowerCase(),
            success: !authError,
            ipAddress: 'web',
            userId,
            metadata: { timestamp: new Date().toISOString() }
          }
        });
      } catch (recordError) {
        console.error('Failed to record login attempt:', recordError);
      }

      // Step 6: Handle authentication failure
      if (authError) {
        // Log authentication failure
        logger.warn('Authentication failed', {
          component: 'useAuth.signIn',
          metadata: {
            email: email.toLowerCase(),
            hasMFA: providerCheck.mfaEnabled,
            error: authError.message,
          },
        });

        // Increment login failure counter
        if (providerCheck.userId) {
          try {
            await supabase.functions.invoke('increment-login-failures', {
              body: { userId: providerCheck.userId }
            });
          } catch (incrementError) {
            console.error('Failed to increment login failures:', incrementError);
          }
        }

        return {
          error: {
            message: "Invalid credentials or verification code"
          }
        };
      }

      if (!authData.user) {
        logger.error('Authentication returned no user', {
          component: 'useAuth.signIn',
          metadata: { email: email.toLowerCase() },
        });
        
        return {
          error: {
            message: "Authentication failed"
          }
        };
      }

      // Step 7: Check account status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('status, email_verified_at')
        .eq('id', authData.user.id)
        .maybeSingle();

      const profile = profileData as Record<string, unknown> | null;

      if (!profile) {
        logger.error('Profile not found after authentication', {
          component: 'useAuth.signIn',
          metadata: { userId: authData.user.id },
        });
        
        await supabase.auth.signOut();
        return {
          error: {
            message: "Account not found"
          }
        };
      }

      if (profile.status === 'deleted') {
        logger.warn('Deleted account login attempt', {
          component: 'useAuth.signIn',
          metadata: { userId: authData.user.id },
        });
        
        await supabase.auth.signOut();
        return {
          error: {
            message: "Account has been deleted"
          }
        };
      }

      // BLOCK unverified accounts
      if (profile.status === 'pending_verification') {
        await supabase.auth.signOut();
        
        // Check if verification expired
        if (profile.verification_expires_at) {
          const expiry = new Date(profile.verification_expires_at as string);
          if (expiry < new Date()) {
            return { 
              error: { 
                message: "Your verification link expired. Please create a new account.",
                code: 'verification_expired'
              } 
            };
          }
        }
        
        return { 
          error: { 
            message: `Please verify your email before signing in. Check ${profile.email || email} for the verification link.`,
            code: 'account_not_verified'
          } 
        };
      }

      // Successful login - reset rate limit counters
      setMfaPending(false);

      // Log successful authentication
      logger.info('User authenticated successfully', {
        component: 'useAuth.signIn',
        metadata: {
          userId: authData.user.id,
          email: email.toLowerCase(),
          hasMFA: providerCheck.mfaEnabled,
        },
      });

      // Reset login rate limit counters
      if (authData.user) {
        try {
          await supabase
            .from('mfa_settings')
            .update({
              failed_login_attempts: 0,
              login_lock_until: null,
            })
            .eq('user_id', authData.user.id);
        } catch (resetError) {
          console.error('Failed to reset login counters:', resetError);
        }
      }

      return {
        error: null,
        user: authData.user
      };

    } catch (error) {
      console.error('Sign in error:', error);
      return {
        error: {
          message: "An unexpected error occurred. Please try again."
        }
      };
    }
  };

  const signUp = async (data: SignUpData) => {
    const { error, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${import.meta.env.VITE_APP_URL ?? window.location.origin}/auth`,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        }
      },
    });

    if (error) return { error };

    // Record user consents
    if (authData.user) {
      try {
        await supabase.from('user_consents').insert({
          user_id: authData.user.id,
          accepted_terms: true,
          accepted_privacy: true,
          consent_data_processing: true,
          consent_ai: true,
          consent_affiliate_transparency: true,
          consent_info_accuracy: true,
          terms_version: '1.0',
          privacy_version: '1.0',
          data_processing_version: '1.0',
          ai_policy_version: '1.0',
          affiliate_policy_version: '1.0',
          consent_policy_version: '1.0',
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      } catch (consentError) {
        console.error('Failed to record user consent:', consentError);
        // Don't block signup if consent recording fails
      }
    }

    // Trigger verification email via edge function
    if (authData.user && authData.session) {
      try {
        const { data, error: emailError } = await supabase.functions.invoke('send-verification-email', {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
          },
        });
        
        if (emailError) {
          console.error('Verification email error:', emailError);
          // Note: Don't throw - account was created successfully
          // User will be notified in Auth.tsx
        }
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Note: Don't throw - account was created successfully
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${import.meta.env.VITE_APP_URL ?? window.location.origin}/auth`,
          queryParams: {
            access_type: 'online',
            prompt: 'select_account', // Let user choose account each time
            // hd: undefined — omit to allow any Google domain
          },
          skipBrowserRedirect: false,
        }
      });

      if (error) {
        console.error('Google OAuth initiation error:', error);
        return { error };
      }

      // Supabase will redirect to Google, no further action needed here
      return { error: null };
    } catch (err: unknown) {
      console.error('Unexpected Google sign-in error:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  // useCallback so consumers (e.g. useSessionActivity) get a stable
  // reference and don't reset their timers on every render.
  const signOut = useCallback(async () => {
    // 1. Clear local React state first so any in-flight queries see
    //    `user === null` and short-circuit before the page reload.
    setUser(null);
    setSession(null);
    setProfile(null);
    setMfaPending(false);

    // 2. Clear React Query cache + auth storage (prevents data leak
    //    between users on shared devices, BFCache replay, etc.).
    clearAuthState({ queryClient });

    // 3. Tell Supabase to revoke the session server-side.
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 4. Full reload to /auth — guarantees no in-memory state survives.
      window.location.href = '/auth';
    }
  }, [queryClient]);

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

  const checkMfaStatus = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-mfa-status', {
        body: { email: email.toLowerCase().trim() }
      });
      
      if (error) throw error;
      return data || { exists: false, hasLocal: false, mfaEnabled: false };
    } catch (error) {
      console.error('MFA check error:', error);
      return { exists: false, hasLocal: false, mfaEnabled: false };
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
    try {
      // Verify the MFA code
      const { data, error } = await supabase.functions.invoke('mfa-verify-totp', {
        body: { userId, code }
      });
      
      if (!data?.valid) {
        return { error: { message: 'Invalid code' } };
      }
      
      // Clear MFA pending state - session is now fully authenticated
      setMfaPending(false);
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'MFA verification failed' } };
    }
  };

  const verifyBackupCode = async (userId: string, code: string) => {
    try {
      // Verify the backup code
      const { data, error } = await supabase.functions.invoke('mfa-verify-backup-code', {
        body: { userId, code }
      });
      
      if (!data?.valid) {
        return { error: { message: 'Invalid backup code' } };
      }
      
      // Clear MFA pending state - session is now fully authenticated
      setMfaPending(false);
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Backup code verification failed' } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        mfaPending,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        sendVerificationEmail,
        requestPasswordReset,
        resetPassword,
        checkAuthProvider,
        checkMfaStatus,
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
