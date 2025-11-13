import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  requiresEmailOTP: boolean;
  requires2FA: boolean;
  verified2FA: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendEmailOTP: () => Promise<{ error: any; data?: any }>;
  send2FAOTP: (method: 'email' | 'sms') => Promise<{ error: any; data?: any }>;
  verifyEmailOTP: (code: string) => Promise<{ error: any }>;
  verify2FAOTP: (code: string) => Promise<{ error: any }>;
  setRequiresEmailOTP: (requires: boolean) => void;
  setRequires2FA: (requires: boolean) => void;
  setVerified2FA: (verified: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresEmailOTP, setRequiresEmailOTP] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [verified2FA, setVerified2FA] = useState(false);
  const navigate = useNavigate();

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth?oauth=google`,
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
    setRequiresEmailOTP(false);
    setRequires2FA(false);
    setVerified2FA(false);
    navigate("/auth");
  };

  const sendEmailOTP = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-otp', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      return { error: null, data };
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return { error };
    }
  };

  const send2FAOTP = async (method: 'email' | 'sms') => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-otp', {
        body: { method },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      return { error: null, data };
    } catch (error: any) {
      console.error('Error sending 2FA OTP:', error);
      return { error };
    }
  };

  const verifyEmailOTP = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { code },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setRequiresEmailOTP(false);
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      return { error };
    }
  };

  const verify2FAOTP = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { code },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setRequires2FA(false);
        setVerified2FA(true);
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error verifying 2FA OTP:', error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      requiresEmailOTP,
      requires2FA,
      verified2FA,
      signIn, 
      signUp, 
      signInWithGoogle, 
      signOut,
      sendEmailOTP,
      send2FAOTP,
      verifyEmailOTP,
      verify2FAOTP,
      setRequiresEmailOTP,
      setRequires2FA,
      setVerified2FA
    }}>
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
