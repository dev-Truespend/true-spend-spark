# ML Training System - Production Deployment Checklist

## ✅ Pre-Deployment Requirements

### 1. Storage Buckets Configuration
**Status:** ⚠️ REQUIRED

Create these buckets in Lovable Cloud:

```
1. ml-training-data
   - Purpose: Store training datasets (JSON/CSV)
   - Visibility: Private
   - RLS: Admin only

2. ml-models  
   - Purpose: Store trained model artifacts
   - Visibility: Private
   - RLS: Admin only
```

**How to Create:**
1. Open Lovable Cloud backend
2. Navigate to Storage section
3. Click "New Bucket"
4. Set name and privacy settings
5. Save

---

### 2. Modal.com Secrets
**Status:** ✅ CONFIGURED

Required secrets:
- ✅ `MODAL_API_TOKEN` - Set
- ✅ `MODAL_WEBHOOK_SECRET` - Set

Verify by running:
```bash
modal token verify
```

---

### 3. Database Migrations
**Status:** ✅ COMPLETE

Tables created:
- ✅ `ml_training_jobs`
- ✅ `ml_model_registry` (with deployment columns)
- ✅ `ml_ab_tests`

Verify with:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ml_%';
```

---

### 4. Edge Functions Deployment
**Status:** ✅ AUTO-DEPLOYED

Functions:
- ✅ `modal-training-trigger`
- ✅ `modal-training-callback`
- ✅ `deploy-shadow-model`
- ✅ `schedule-retraining`

These deploy automatically with code changes.

---

### 5. Modal Functions Deployment
**Status:** ⚠️ USER ACTION REQUIRED

Deploy Modal training functions:
```bash
cd ~/truespend
modal deploy modal_training.py
```

Verify deployment:
```bash
modal app list
# Should show: truespend-ml
```

---

### 6. Admin User Creation
**Status:** ⚠️ VERIFY

Ensure at least one admin user exists:
```sql
SELECT u.email, ur.role 
FROM profiles u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

Create admin if needed:
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM profiles
WHERE email = 'your-email@example.com';
```

---

## 🧪 Smoke Testing

### Test 1: Upload Training Data
1. Navigate to `/admin/ml-training`
2. Click "Training Data" tab
3. Upload `test_data.json`:
```json
[
  {"feature": 1, "label": "A"},
  {"feature": 2, "label": "B"}
]
```
4. ✅ Verify upload succeeds

---

### Test 2: Trigger Training Job
1. Click "Start Training" tab
2. Select model type: "DQN Cache Policy"
3. Select file: `test_data.json`
4. Verify config auto-populates
5. Click "Start Training Job"
6. ✅ Verify toast shows "Training job started"

---

### Test 3: Monitor Job Status
1. Click "Training Jobs" tab
2. ✅ Verify job appears with status "running" or "pending"
3. Wait 2-5 minutes
4. Refresh page
5. ✅ Verify status updates to "completed" or "failed"

---

### Test 4: Check Model Registry
1. After job completes, click "Model Registry"
2. ✅ Verify new model appears
3. Click "Download Model"
4. ✅ Verify model artifact downloads

---

### Test 5: Run Data Quality Check
1. Click "Data Quality" tab
2. Select uploaded file
3. Click "Run Quality Check"
4. ✅ Verify quality report displays with score

---

## 📊 Monitoring Setup

### 1. Cost Monitoring
**Action:** Review costs weekly

Check:
- Modal dashboard: GPU hours consumed
- Supabase storage: Data usage
- Edge function invocations

**Alert Threshold:** $50/month

---

### 2. Performance Monitoring
**Action:** Monitor latency & error rates

Check:
- Click "Health" tab daily
- Verify all models show "healthy" status
- Alert if latency > 200ms or error rate > 3%

---

### 3. Training Failures
**Action:** Review alerts

Check:
- Click "Alerts" tab
- Investigate any failed jobs
- Check Modal logs for errors

---

## 🔒 Security Checklist

- ✅ RLS policies enabled on all ML tables
- ✅ Admin-only access to ML endpoints
- ✅ Webhook signature verification configured
- ✅ Training data stored in private buckets
- ✅ Signed URLs with 1-hour expiry
- ⚠️ **TODO:** Enable rate limiting on training triggers

---

## 🚀 Go-Live Steps

1. **Create Storage Buckets** (5 min)
   ```
   - Create ml-training-data bucket
   - Create ml-models bucket
   ```

2. **Upload Sample Data** (2 min)
   ```
   - Upload one test JSON file
   - Verify file appears in dashboard
   ```

3. **Trigger Test Job** (5 min)
   ```
   - Start one training job
   - Monitor completion
   - Verify model in registry
   ```

4. **Run E2E Tests** (10 min)
   ```bash
   npx playwright test e2e/phase14
   ```

5. **Enable Production Access** (1 min)
   ```
   - Announce ML Training tab to team
   - Share docs/MODAL_INTEGRATION_GUIDE.md
   ```

**Total Time:** ~25 minutes

---

## 🛟 Rollback Plan

If critical issues arise:

1. **Disable ML Training Tab**
```typescript
// In AdminDashboardLayout.tsx, comment out:
// { title: "ML Training", href: "/admin/ml-training", icon: Brain }
```

2. **Pause All Training Jobs**
```sql
UPDATE ml_training_jobs 
SET status = 'cancelled' 
WHERE status = 'running';
```

3. **Disable Shadow Deployments**
```sql
UPDATE ml_model_registry 
SET shadow_deployed = false;
```

**Rollback Time:** < 5 minutes  
**Data Loss:** None (all data retained)

---

## 📞 Support

**Internal Issues:**
- Check: `docs/MODAL_INTEGRATION_GUIDE.md`
- Check: `docs/ML_PRODUCTION_READINESS_REPORT.md`

**External Issues:**
- Modal Support: support@modal.com
- Supabase Support: support@supabase.com

---

## ✅ Final Checklist

Before declaring PRODUCTION READY:

- [ ] Storage buckets created (`ml-training-data`, `ml-models`)
- [ ] Modal functions deployed (`modal deploy modal_training.py`)
- [ ] Admin user exists and can access `/admin/ml-training`
- [ ] Test training job completed successfully
- [ ] E2E tests pass
- [ ] Cost monitoring configured
- [ ] Team trained on new features
- [ ] Documentation shared

**Once all checked:** 🎉 **PRODUCTION READY**