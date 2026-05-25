/**
 * Phase 10: Alert Rules Manager Component
 * Manage alert routing rules and notification preferences
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { toast } from '@/shared/hooks/use-toast';
import { Bell, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  severity: string;
  channels: string[];
  active: boolean;
  escalation_timeout_minutes: number;
  user_ids: string[];
}

export function AlertRulesManager() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AlertRule>>({});
  const [isCreating, setIsCreating] = useState(false);

  const { data: alertRules, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('severity', { ascending: false });
      
      if (error) throw error;
      return data as AlertRule[];
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('alert_rules')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast({
        title: 'Success',
        description: 'Alert rule updated',
      });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async (rule: Partial<AlertRule> & { id: string }) => {
      const { error } = await supabase
        .from('alert_rules')
        .update(rule)
        .eq('id', rule.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setEditingRule(null);
      setEditForm({});
      toast({
        title: 'Success',
        description: 'Alert rule saved',
      });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast({
        title: 'Success',
        description: 'Alert rule deleted',
      });
    }
  });

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    };
    return <Badge variant={variants[severity] || 'default'}>{severity}</Badge>;
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule.id);
    setEditForm(rule);
  };

  const handleSave = () => {
    if (editingRule && editForm.id) {
      updateRuleMutation.mutate(editForm as AlertRule & { id: string });
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    setEditForm({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading alert rules...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Rules
            </CardTitle>
            <CardDescription>
              Configure alert routing and notification preferences
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alertRules?.map((rule) => (
          <div
            key={rule.id}
            className="border rounded-lg p-4 space-y-3"
          >
            {editingRule === rule.id ? (
              <div className="space-y-3">
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Rule name"
                />
                <Select
                  value={editForm.severity || rule.severity}
                  onValueChange={(value) => setEditForm({ ...editForm, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Channels: {rule.channels.join(', ')}
                      </div>
                    </div>
                    {getSeverityBadge(rule.severity)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: rule.id, active: checked })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Escalation timeout: {rule.escalation_timeout_minutes} minutes
                </div>
              </>
            )}
          </div>
        ))}
        
        {alertRules?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No alert rules configured
          </div>
        )}
      </CardContent>
    </Card>
  );
}
