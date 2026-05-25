import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface FeatureFlag {
  id: string;
  flag_name: string;
  enabled: boolean;
  metadata?: any;
}

export function HuggingFaceFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .like('flag_name', 'hf_%');

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagId: string, currentValue: boolean) => {
    setUpdating(flagId);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: !currentValue })
        .eq('id', flagId);

      if (error) throw error;

      setFlags(flags.map(f => 
        f.id === flagId ? { ...f, enabled: !currentValue } : f
      ));

      toast.success(`Feature flag ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle feature flag:', error);
      toast.error('Failed to update feature flag');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const getFlagDescription = (flagName: string) => {
    switch (flagName) {
      case 'hf_client_categorization_enabled':
        return {
          title: 'Client-side Categorization',
          description: 'Enable browser-based transaction categorization using Transformers.js',
          impact: 'Reduces server load and API costs, but requires downloading models to browser'
        };
      case 'hf_server_ocr_fallback':
        return {
          title: 'HF OCR Fallback',
          description: 'Use HF Inference API as fallback when primary OCR fails',
          impact: 'Improves reliability but increases API usage'
        };
      case 'hf_primary_for_ocr':
        return {
          title: 'HF Primary OCR',
          description: 'Use HF Inference API as primary OCR service',
          impact: 'May increase latency but provides alternative to Lovable AI'
        };
      default:
        return {
          title: flagName,
          description: 'Custom feature flag',
          impact: 'Unknown'
        };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hugging Face Feature Flags</CardTitle>
        <CardDescription>Control HF service behavior and fallback chains</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {flags.map((flag) => {
          const info = getFlagDescription(flag.flag_name);
          return (
            <div key={flag.id} className="flex items-start justify-between space-x-4 p-4 rounded-lg border">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={flag.id} className="text-base font-medium cursor-pointer">
                    {info.title}
                  </Label>
                  {flag.enabled ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {info.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Impact:</span> {info.impact}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {updating === flag.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  id={flag.id}
                  checked={flag.enabled}
                  onCheckedChange={() => toggleFlag(flag.id, flag.enabled)}
                  disabled={updating === flag.id}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
