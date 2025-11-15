-- Create transaction_rules table for rules engine
-- Note: This table already exists based on the types.ts file, but let's ensure it has proper indexes

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transaction_rules_user_active 
ON public.transaction_rules(user_id, active) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_transaction_rules_priority 
ON public.transaction_rules(priority DESC);

-- Create function to evaluate transaction rules
CREATE OR REPLACE FUNCTION public.evaluate_transaction_rules(
  p_user_id uuid,
  p_transaction_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_rule RECORD;
  v_actions_applied jsonb := '[]'::jsonb;
  v_condition_met boolean;
BEGIN
  -- Fetch active rules for user, ordered by priority
  FOR v_rule IN 
    SELECT id, rule_name, conditions, actions, priority
    FROM transaction_rules
    WHERE user_id = p_user_id
      AND active = true
    ORDER BY priority DESC
  LOOP
    -- Simple condition evaluation (can be enhanced)
    v_condition_met := true;
    
    -- Check amount conditions
    IF v_rule.conditions ? 'min_amount' THEN
      IF (p_transaction_data->>'amount')::numeric < (v_rule.conditions->>'min_amount')::numeric THEN
        v_condition_met := false;
      END IF;
    END IF;
    
    IF v_rule.conditions ? 'max_amount' THEN
      IF (p_transaction_data->>'amount')::numeric > (v_rule.conditions->>'max_amount')::numeric THEN
        v_condition_met := false;
      END IF;
    END IF;
    
    -- Check category conditions
    IF v_rule.conditions ? 'category' THEN
      IF p_transaction_data->>'category' != v_rule.conditions->>'category' THEN
        v_condition_met := false;
      END IF;
    END IF;
    
    -- If all conditions met, collect actions
    IF v_condition_met THEN
      v_actions_applied := v_actions_applied || jsonb_build_object(
        'rule_id', v_rule.id,
        'rule_name', v_rule.rule_name,
        'actions', v_rule.actions
      );
    END IF;
  END LOOP;
  
  RETURN v_actions_applied;
END;
$function$;