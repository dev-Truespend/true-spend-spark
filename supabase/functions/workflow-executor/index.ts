import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowStep {
  name: string;
  type: 'function' | 'condition' | 'parallel' | 'wait';
  function?: string;
  condition?: string;
  onTrue?: string;
  onFalse?: string;
  input?: any;
  waitMs?: number;
  steps?: WorkflowStep[];
}

interface WorkflowDefinition {
  steps: WorkflowStep[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { workflowId, workflowName, executionId, context, triggerType, triggerData } = await req.json();

    console.log(`Starting workflow execution: ${workflowName || workflowId}`);

    // Get workflow definition
    let workflow: any;
    if (workflowId) {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('enabled', true)
        .single();

      if (error) throw error;
      workflow = data;
    } else if (workflowName) {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('workflow_name', workflowName)
        .eq('enabled', true)
        .single();

      if (error) throw error;
      workflow = data;
    } else {
      throw new Error('Either workflowId or workflowName is required');
    }

    const definition = workflow.definition as WorkflowDefinition;
    const startTime = Date.now();

    // Create or get execution record
    let execution: any;
    if (executionId) {
      const { data } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();
      execution = data;
    } else {
      const { data, error } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflow.id,
          workflow_name: workflow.workflow_name,
          workflow_version: workflow.version,
          status: 'running',
          trigger_type: triggerType || 'manual',
          trigger_data: triggerData || {},
          context: context || {},
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      execution = data;
    }

    console.log(`Execution ID: ${execution.id}`);

    // Execute workflow steps
    const workflowContext = execution.context;
    let currentStepIndex = 0;

    try {
      for (const step of definition.steps) {
        const stepResult = await executeStep(
          supabase,
          execution.id,
          step,
          currentStepIndex,
          workflowContext
        );

        if (stepResult.status === 'failed') {
          throw new Error(`Step ${step.name} failed: ${stepResult.error}`);
        }

        // Update context with step output
        if (stepResult.output) {
          Object.assign(workflowContext, stepResult.output);
        }

        // Handle conditional branching
        if (step.type === 'condition' && stepResult.output?.nextStep) {
          const nextStepName = stepResult.output.nextStep;
          const nextStepIndex = definition.steps.findIndex(s => s.name === nextStepName);
          if (nextStepIndex > currentStepIndex) {
            currentStepIndex = nextStepIndex - 1; // Will be incremented in loop
          }
        }

        currentStepIndex++;
      }

      // Mark execution as completed
      const duration = Date.now() - startTime;
      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          context: workflowContext,
        })
        .eq('id', execution.id);

      console.log(`Workflow completed in ${duration}ms`);

      return new Response(JSON.stringify({
        success: true,
        executionId: execution.id,
        status: 'completed',
        duration_ms: duration,
        context: workflowContext,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Workflow execution failed:', error);

      const duration = Date.now() - startTime;
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', execution.id);

      // Check if we should retry
      if (execution.retry_count < execution.max_retries) {
        await supabase
          .from('workflow_executions')
          .update({
            status: 'retrying',
            retry_count: execution.retry_count + 1,
          })
          .eq('id', execution.id);

        // Schedule retry (could trigger via event or webhook)
        console.log(`Scheduling retry ${execution.retry_count + 1}/${execution.max_retries}`);
      }

      throw error;
    }

  } catch (error) {
    console.error('Error in workflow-executor:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeStep(
  supabase: any,
  executionId: string,
  step: WorkflowStep,
  stepIndex: number,
  context: any
): Promise<{ status: string; output?: any; error?: string }> {
  const startTime = Date.now();

  // Create step execution record
  const { data: stepExecution, error: createError } = await supabase
    .from('workflow_step_executions')
    .insert({
      execution_id: executionId,
      step_name: step.name,
      step_type: step.type,
      step_index: stepIndex,
      status: 'running',
      started_at: new Date().toISOString(),
      input_data: step.input || {},
    })
    .select()
    .single();

  if (createError) {
    console.error('Failed to create step execution:', createError);
    return { status: 'failed', error: createError.message };
  }

  console.log(`Executing step ${stepIndex}: ${step.name} (${step.type})`);

  try {
    let output: any = null;

    switch (step.type) {
      case 'function':
        output = await executeFunctionStep(supabase, step, context);
        break;
      case 'condition':
        output = await executeConditionStep(step, context);
        break;
      case 'wait':
        output = await executeWaitStep(step);
        break;
      case 'parallel':
        output = await executeParallelStep(supabase, executionId, step, context);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    const duration = Date.now() - startTime;

    // Update step execution
    await supabase
      .from('workflow_step_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        output_data: output,
      })
      .eq('id', stepExecution.id);

    console.log(`Step ${step.name} completed in ${duration}ms`);

    return { status: 'completed', output };

  } catch (error) {
    const duration = Date.now() - startTime;

    await supabase
      .from('workflow_step_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', stepExecution.id);

    console.error(`Step ${step.name} failed:`, error);

    return { 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function executeFunctionStep(supabase: any, step: WorkflowStep, context: any): Promise<any> {
  if (!step.function) {
    throw new Error('Function name is required for function step');
  }

  // Replace template variables in input
  const input = replaceTemplateVariables(step.input || {}, context);

  console.log(`Calling function: ${step.function} with input:`, input);

  // Call the edge function
  const { data, error } = await supabase.functions.invoke(step.function, {
    body: input,
  });

  if (error) throw error;

  return data;
}

async function executeConditionStep(step: WorkflowStep, context: any): Promise<any> {
  if (!step.condition) {
    throw new Error('Condition is required for condition step');
  }

  console.log(`Evaluating condition: ${step.condition}`);

  // Simple condition evaluation (in production, use a proper expression evaluator)
  const result = evaluateCondition(step.condition, context);

  console.log(`Condition result: ${result}`);

  const nextStep = result ? step.onTrue : step.onFalse;

  return {
    conditionResult: result,
    nextStep: nextStep || 'continue',
  };
}

async function executeWaitStep(step: WorkflowStep): Promise<any> {
  const waitMs = step.waitMs || 1000;
  console.log(`Waiting ${waitMs}ms`);
  await new Promise(resolve => setTimeout(resolve, waitMs));
  return { waited: waitMs };
}

async function executeParallelStep(
  supabase: any,
  executionId: string,
  step: WorkflowStep,
  context: any
): Promise<any> {
  if (!step.steps || step.steps.length === 0) {
    throw new Error('Parallel step requires sub-steps');
  }

  console.log(`Executing ${step.steps.length} steps in parallel`);

  const results = await Promise.allSettled(
    step.steps.map((subStep, index) => 
      executeStep(supabase, executionId, subStep, index, context)
    )
  );

  const outputs = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value.output;
    } else {
      console.error(`Parallel step ${index} failed:`, result.reason);
      return { error: result.reason };
    }
  });

  return { parallelResults: outputs };
}

function replaceTemplateVariables(obj: any, context: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((acc: any, key: string) => acc?.[key], context);
      return value !== undefined ? value : match;
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(item => replaceTemplateVariables(item, context));
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceTemplateVariables(value, context);
    }
    return result;
  }

  return obj;
}

function evaluateCondition(condition: string, context: any): boolean {
  try {
    // Simple evaluation - in production use a proper expression parser
    const replaced = condition.replace(/context\.(\w+)/g, (match, key) => {
      const value = context[key];
      return typeof value === 'string' ? `"${value}"` : String(value);
    });

    // eslint-disable-next-line no-eval
    return eval(replaced);
  } catch (error) {
    console.error('Condition evaluation error:', error);
    return false;
  }
}