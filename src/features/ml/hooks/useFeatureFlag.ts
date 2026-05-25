import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface FeatureFlagConfig {
  flagName: string;
  defaultValue?: boolean;
  environment?: 'development' | 'staging' | 'production' | 'all';
}

export function useFeatureFlag(config: FeatureFlagConfig | string) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const flagConfig = typeof config === 'string' 
    ? { flagName: config, defaultValue: false, environment: 'production' as const }
    : { defaultValue: false, environment: 'production' as const, ...config };

  useEffect(() => {
    let mounted = true;

    const evaluateFlag = async () => {
      if (!user) {
        setEnabled(flagConfig.defaultValue);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: evalError } = await supabase.functions.invoke(
          'feature-flag-evaluator',
          {
            body: {
              flagName: flagConfig.flagName,
              environment: flagConfig.environment,
            },
          }
        );

        if (evalError) throw evalError;

        if (mounted) {
          setEnabled(data?.enabled ?? flagConfig.defaultValue);
        }
      } catch (err) {
        console.error('Error evaluating feature flag:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setEnabled(flagConfig.defaultValue);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    evaluateFlag();

    // Subscribe to feature flag changes
    const channel = supabase
      .channel(`feature-flag-${flagConfig.flagName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
          filter: `flag_name=eq.${flagConfig.flagName}`,
        },
        () => {
          evaluateFlag();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [user, flagConfig.flagName, flagConfig.environment, flagConfig.defaultValue]);

  return { enabled, loading, error };
}

export function useFeatureFlags(flagNames: string[]) {
  const flags = flagNames.reduce((acc, flagName) => {
    acc[flagName] = useFeatureFlag(flagName);
    return acc;
  }, {} as Record<string, ReturnType<typeof useFeatureFlag>>);

  return flags;
}