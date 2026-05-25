// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Slider } from '@/shared/components/ui/slider';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { Plus, Trash2, Users, Target, Percent } from 'lucide-react';

interface FeatureFlag {
  id: string;
  flag_name: string;
  enabled: boolean;
  rollout_percentage: number;
  target_users: string[];
  target_roles: string[];
  environment: string;
  config: any;
  created_at: string;
  updated_at: string;
}

export function FeatureFlagManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFlagName, setNewFlagName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchFlags();
    
    const channel = supabase
      .channel('feature-flags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
        },
        () => {
          fetchFlags();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error fetching flags:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch feature flags',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createFlag = async () => {
    if (!newFlagName.trim()) return;

    try {
      const { error } = await supabase
        .from('feature_flags')
        .insert({
          flag_name: newFlagName,
          enabled: false,
          rollout_percentage: 100,
          environment: 'production',
        });

      if (error) throw error;

      setNewFlagName('');
      toast({
        title: 'Success',
        description: 'Feature flag created',
      });
    } catch (error) {
      console.error('Error creating flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to create feature flag',
        variant: 'destructive',
      });
    }
  };

  const toggleFlag = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Flag ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flag',
        variant: 'destructive',
      });
    }
  };

  const updateRollout = async (id: string, percentage: number) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ rollout_percentage: percentage })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating rollout:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rollout percentage',
        variant: 'destructive',
      });
    }
  };

  const deleteFlag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feature flag deleted',
      });
    } catch (error) {
      console.error('Error deleting flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete feature flag',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading feature flags...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Feature Flag</CardTitle>
          <CardDescription>Add a new feature flag to control rollout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="feature-flag-name"
              value={newFlagName}
              onChange={(e) => setNewFlagName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createFlag()}
            />
            <Button onClick={createFlag} disabled={!newFlagName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{flag.flag_name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline">{flag.environment}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => toggleFlag(flag.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFlag(flag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Rollout Percentage
                  </Label>
                  <span className="text-sm font-medium">{flag.rollout_percentage}%</span>
                </div>
                <Slider
                  value={[flag.rollout_percentage]}
                  onValueChange={([value]) => updateRollout(flag.id, value)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {flag.target_users && flag.target_users.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Target Users
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {flag.target_users.map((userId) => (
                      <Badge key={userId} variant="secondary" className="text-xs">
                        {userId.substring(0, 8)}...
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {flag.target_roles && flag.target_roles.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Roles
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {flag.target_roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {flags.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No feature flags yet. Create one to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}