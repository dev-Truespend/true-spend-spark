# Modal.com Integration Guide for TrueSpend v4.2

## Overview

This guide explains how to integrate Modal.com for GPU-accelerated ML model training in **Phase 14 (Weeks 44-46)** of the TrueSpend v4.2 implementation timeline.

**Current Status**: Infrastructure ready, awaiting Week 44 implementation.

## Why Modal.com?

Modal.com provides:
- **On-demand GPU access** for training custom ML models (DQN, LSTM, DistilBERT)
- **Cost efficiency**: ~$11/month vs. traditional cloud GPU costs ($100+/month)
- **Auto-scaling**: 0-5 containers based on demand
- **Simple deployment**: No Kubernetes or infrastructure management

## When to Use Modal.com

**NOT NOW** - Wait until Week 44 (Phase 14: ML Infrastructure)

Use Modal.com for:
1. **DQN Cache Policy Training** (Week 45) - GPU T4, 1-2 hours
2. **LSTM Anomaly Detection** (Week 45) - GPU T4, 2-3 hours  
3. **DistilBERT Fine-tuning** (Week 46) - GPU T4, 3-4 hours
4. **ALS Matrix Factorization** (Week 46) - CPU, 30 min

**Don't use for**:
- Real-time inference (use Lovable AI Gateway instead)
- Small model training (<10K samples)
- Before collecting sufficient training data

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Lovable Cloud Backend (Supabase Edge Functions)        │
│ • modal-training-trigger: Starts Modal jobs            │
│ • modal-training-callback: Receives results            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Modal.com (GPU Training)                                │
│ • train-dqn-cache-policy (Python + PyTorch)            │
│ • train-lstm-anomaly-detector (Python + PyTorch)       │
│ • train-distilbert-classifier (Python + Transformers)  │
│ • train-als-recommender (Python + Implicit)            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Lovable Cloud Storage (Model Registry)                 │
│ • ml-models bucket: Trained model artifacts            │
│ • training-data bucket: Input datasets                 │
│ • ml_model_registry table: Model metadata              │
│ • ml_training_jobs table: Job tracking                 │
└─────────────────────────────────────────────────────────┘
```

## Setup Instructions (Week 44)

### Step 1: Create Modal.com Account

1. Go to [modal.com](https://modal.com)
2. Sign up with your email
3. Create a new workspace: "TrueSpend ML"
4. Note your workspace ID

### Step 2: Configure Modal Secrets

**In Modal.com Dashboard:**

1. Go to **Settings → Secrets**
2. Add these secrets:
   ```
   supabase-url: https://uolpwcngftpmgkopltwz.supabase.co
   supabase-anon-key: [Your VITE_SUPABASE_PUBLISHABLE_KEY from .env]
   model-registry-webhook: https://uolpwcngftpmgkopltwz.supabase.co/functions/v1/modal-training-callback
   ```

⚠️ **SECURITY**: Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Modal. Only use the public anon key.

### Step 3: Add Modal API Token to Lovable Cloud

1. In Modal.com, go to **Settings → API Tokens**
2. Create a new token: "TrueSpend Training Jobs"
3. Copy the token
4. Add to Lovable Cloud secrets:
   - Secret name: `MODAL_API_TOKEN`
   - Secret value: [paste token]

5. (Optional) Create webhook secret:
   - Secret name: `MODAL_WEBHOOK_SECRET`
   - Secret value: [generate random 32-char string]

### Step 4: Deploy Modal Training Functions

**Create a Modal Python project:**

```bash
# Install Modal CLI
pip install modal

# Authenticate
modal token new

# Create modal_training.py (see Python code below)
# Deploy functions
modal deploy modal_training.py
```

**Python Training Functions** (modal_training.py):

```python
import modal

stub = modal.Stub("truespend-ml")

# Define container image with dependencies
image = modal.Image.debian_slim().pip_install(
    "torch==2.1.0",
    "numpy>=1.24.0",
    "requests>=2.31.0",
    "transformers>=4.35.0",
    "implicit>=0.7.0",
)

@stub.function(
    gpu="T4",
    timeout=3600,  # 1 hour
    secrets=[modal.Secret.from_name("supabase-credentials")],
    image=image,
)
def train_dqn_cache_policy(training_data_url: str, callback_url: str, config: dict):
    """Train DQN cache policy with GPU acceleration"""
    import torch
    import requests
    import os
    
    print(f"Starting DQN training with config: {config}")
    
    # Download training data
    response = requests.get(training_data_url)
    data = response.json()
    
    # TODO: Implement DQN training logic
    # This is a placeholder for Week 45 implementation
    
    # Upload model artifact to Supabase Storage
    model_path = "/tmp/dqn_cache_v1.pt"
    # torch.save(model.state_dict(), model_path)
    
    with open(model_path, 'rb') as f:
        files = {'file': f}
        upload_response = requests.post(
            f"{os.environ['SUPABASE_URL']}/storage/v1/object/ml-models/dqn_cache_v1.pt",
            files=files,
            headers={'Authorization': f"Bearer {os.environ['SUPABASE_ANON_KEY']}"}
        )
    
    # Callback with results
    requests.post(callback_url, json={
        'model_id': 'dqn_cache_v1',
        'artifact_url': upload_response.json()['url'],
        'metrics': {'final_loss': 0.05, 'training_time_mins': 45},
        'modal_job_id': 'job_123',
        'status': 'completed'
    })
    
    return {'status': 'success'}


@stub.function(
    gpu="T4",
    timeout=7200,  # 2 hours
    secrets=[modal.Secret.from_name("supabase-credentials")],
    image=image,
)
def train_lstm_anomaly_detector(training_data_url: str, callback_url: str, config: dict):
    """Train LSTM anomaly detector with GPU acceleration"""
    # TODO: Implement LSTM training logic (Week 45)
    pass


@stub.function(
    gpu="T4",
    timeout=14400,  # 4 hours
    secrets=[modal.Secret.from_name("supabase-credentials")],
    image=image,
)
def train_distilbert_classifier(training_data_url: str, callback_url: str, config: dict):
    """Fine-tune DistilBERT for transaction categorization"""
    # TODO: Implement DistilBERT fine-tuning (Week 46)
    pass


@stub.function(
    cpu=4,
    timeout=1800,  # 30 minutes
    secrets=[modal.Secret.from_name("supabase-credentials")],
    image=image,
)
def train_als_recommender(training_data_url: str, callback_url: str, config: dict):
    """Train ALS recommender for merchant suggestions"""
    # TODO: Implement ALS training (Week 46)
    pass
```

## Usage (Week 45+)

### Trigger Training Job

```typescript
// From admin dashboard or CLI
const { data, error } = await supabase.functions.invoke('modal-training-trigger', {
  body: {
    model_type: 'dqn_cache',  // or 'lstm_anomaly', 'distilbert_classifier', 'als_recommender'
    training_data_id: 'dqn_training_20250101',
    config: {
      learning_rate: 0.001,
      batch_size: 32,
      epochs: 100,
    }
  }
});

console.log('Training job started:', data.job_id);
```

### Monitor Training

```typescript
// Check job status
const { data: job } = await supabase
  .from('ml_training_jobs')
  .select('*')
  .eq('id', jobId)
  .single();

console.log('Job status:', job.status);
console.log('Modal job ID:', job.modal_job_id);

// View in Modal dashboard:
// https://modal.com/dashboard/jobs/<modal_job_id>
```

### Access Trained Models

```typescript
// Get model from registry
const { data: model } = await supabase
  .from('ml_model_registry')
  .select('*')
  .eq('model_id', 'dqn_cache_v1')
  .single();

console.log('Model artifact:', model.artifact_url);
console.log('Metrics:', model.metrics);

// Download model for deployment
const { data: artifactBlob } = await supabase.storage
  .from('ml-models')
  .download('dqn_cache_v1.pt');
```

## Database Schema

### ml_model_registry

Stores metadata for all trained models:

```sql
CREATE TABLE ml_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL,
  version TEXT NOT NULL,
  artifact_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'training',
  metrics JSONB,
  training_config JSONB,
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ml_training_jobs

Tracks all training jobs:

```sql
CREATE TABLE ml_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  modal_job_id TEXT,
  training_data_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  resulting_model_id TEXT REFERENCES ml_model_registry(model_id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Cost Estimation

| Model | GPU Type | Duration | Cost/Run | Runs/Month | Monthly Cost |
|-------|----------|----------|----------|------------|--------------|
| DQN Cache | T4 | 1-2 hrs | $0.60-$1.20 | 4 (weekly) | $4.80 |
| LSTM Anomaly | T4 | 2-3 hrs | $1.20-$1.80 | 2 (bi-weekly) | $3.60 |
| DistilBERT | T4 | 3-4 hrs | $1.80-$2.40 | 1 (monthly) | $2.40 |
| ALS | CPU | 30 min | $0.05 | 4 (weekly) | $0.20 |
| **Total** | | | | | **~$11/month** |

Compare to:
- Lovable AI (inference): ~$100/month
- HuggingFace Inference: ~$0-50/month
- **Total with Modal: ~$161/month** (vs. $500/month projected)

## Security Best Practices

✅ **DO**:
- Keep `SUPABASE_SERVICE_ROLE_KEY` in Lovable Cloud only
- Use signed URLs for training data access (1-hour expiry)
- Verify webhook signatures with `MODAL_WEBHOOK_SECRET`
- Restrict ML model bucket to admin users only
- Log all training events to `event_log` table

❌ **DON'T**:
- Share service role key with Modal
- Make model buckets public
- Skip webhook signature verification
- Store sensitive data in training datasets
- Trigger training jobs from client-side code

## Troubleshooting

### Issue: "MODAL_API_TOKEN not configured"

**Solution**: Add the secret in Lovable Cloud:
1. Go to your project
2. Cloud → Settings → Secrets
3. Add `MODAL_API_TOKEN` with your Modal API token

### Issue: "Failed to create training data URL"

**Solution**: Ensure training data file exists:
```typescript
// Upload training data first
await supabase.storage
  .from('training-data')
  .upload('my_training_data.json', file);
```

### Issue: Modal job fails with "Authentication error"

**Solution**: Check Modal secrets are configured correctly:
- `supabase-url`: Matches `VITE_SUPABASE_URL`
- `supabase-anon-key`: Matches `VITE_SUPABASE_PUBLISHABLE_KEY`

## Next Steps

**Week 44 (Current):**
- [x] Database tables created (`ml_model_registry`, `ml_training_jobs`)
- [x] Storage buckets created (`ml-models`, `training-data`)
- [x] Edge functions created (`modal-training-trigger`, `modal-training-callback`)
- [ ] Modal account setup (USER ACTION REQUIRED)
- [ ] Modal API token added to secrets (USER ACTION REQUIRED)
- [ ] Modal Python functions deployed (Week 44 task)

**Week 45:**
- [ ] Collect 1M+ API request logs for DQN training
- [ ] Implement DQN training logic in Modal
- [ ] Train DQN cache policy (shadow mode)
- [ ] Train LSTM anomaly detector (shadow mode)

**Week 46:**
- [ ] Fine-tune DistilBERT on transaction data
- [ ] Train ALS recommender
- [ ] Deploy to shadow mode for A/B testing
- [ ] Monitor accuracy vs. baseline

## Support

**Questions?**
- Modal.com docs: https://modal.com/docs
- TrueSpend Blueprint v4.2: `docs/architecture/blueprint-v4.2.md`
- Timeline: `docs/architecture/implementation-timeline-v4.2.md`

**Issues?**
- Check Modal dashboard logs: https://modal.com/dashboard
- View Lovable Cloud logs: Cloud → Functions → Logs
- Debug training jobs: Query `ml_training_jobs` table