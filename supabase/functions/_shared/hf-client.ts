/**
 * Hugging Face Inference API client for server-side edge functions
 * Uses HF_ACCESS_TOKEN from environment
 */

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

export interface HFInferenceOptions {
  model: string;
  inputs: any;
  parameters?: Record<string, any>;
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface HFInferenceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  model: string;
  latencyMs: number;
}

/**
 * Call Hugging Face Inference API
 */
export async function callHFInference<T = any>(
  options: HFInferenceOptions
): Promise<HFInferenceResult<T>> {
  const startTime = Date.now();
  const token = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

  if (!token) {
    return {
      success: false,
      error: 'HUGGING_FACE_ACCESS_TOKEN not configured',
      model: options.model,
      latencyMs: Date.now() - startTime,
    };
  }

  const url = `${HF_API_BASE}/${options.model}`;

  try {
    console.log(`[HF API] Calling ${options.model}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: options.inputs,
        parameters: options.parameters,
        options: {
          wait_for_model: true,
          use_cache: true,
          ...options.options,
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HF API] Error ${response.status}:`, errorText);

      // Check for rate limiting
      if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          model: options.model,
          latencyMs,
        };
      }

      // Check for model loading
      if (response.status === 503) {
        return {
          success: false,
          error: 'Model is loading, try again in a moment',
          model: options.model,
          latencyMs,
        };
      }

      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
        model: options.model,
        latencyMs,
      };
    }

    const data = await response.json();
    console.log(`[HF API] Success in ${latencyMs}ms`);

    return {
      success: true,
      data: data as T,
      model: options.model,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('[HF API] Request failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: options.model,
      latencyMs,
    };
  }
}

/**
 * Text classification using zero-shot
 */
export async function classifyText(
  text: string,
  candidateLabels: string[],
  model = 'facebook/bart-large-mnli'
): Promise<HFInferenceResult<Array<{ label: string; score: number }>>> {
  return callHFInference({
    model,
    inputs: text,
    parameters: {
      candidate_labels: candidateLabels,
    },
  });
}

/**
 * OCR on image (base64)
 */
export async function extractTextFromImage(
  imageBase64: string,
  model = 'microsoft/trocr-base-printed'
): Promise<HFInferenceResult<{ generated_text: string }>> {
  return callHFInference({
    model,
    inputs: imageBase64,
  });
}

/**
 * Text generation
 */
export async function generateText(
  prompt: string,
  maxLength = 200,
  model = 'mistralai/Mistral-7B-Instruct-v0.2'
): Promise<HFInferenceResult<Array<{ generated_text: string }>>> {
  return callHFInference({
    model,
    inputs: prompt,
    parameters: {
      max_length: maxLength,
      temperature: 0.7,
      top_p: 0.9,
    },
  });
}
