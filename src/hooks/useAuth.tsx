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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<{ error: any }>;
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
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Check account status - cast to any to bypass stale types
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const profile = profileData as any;
      if (profile?.status === 'deleted') {
        await supabase.auth.signOut();
        return { error: { message: 'This account no longer exists. Please sign up again.' } };
      }

      if (profile?.status === 'pending_verification' && profile.verification_expires_at) {
        const expiry = new Date(profile.verification_expires_at);
        if (expiry < new Date()) {
          await supabase.auth.signOut();
          return { error: { message: 'Your verification link expired. Please sign up again.' } };
        }
      }
    }

    return { error };
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
