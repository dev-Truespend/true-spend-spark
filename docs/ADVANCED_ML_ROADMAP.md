# Phase 15: Advanced ML & Revenue - Roadmap

**Status:** 0% Complete (Not Started)  
**Planned Duration:** 3 weeks (Weeks 47-49)  
**Priority:** High (Revenue Generation + AI Innovation)

---

## Executive Summary

Phase 15 implements **8 advanced ML models** for intelligent optimization, personalization, and revenue generation. This phase builds on Phase 14's ML infrastructure to deliver:
- Multi-Armed Bandits (Thompson Sampling) for budget allocation
- K-Means++ for geofence optimization
- LambdaMART for offer ranking
- Prophet for time-series forecasting
- Layer 10B (Deals & Cashback Gateway) for affiliate revenue

**Expected Revenue Impact:** $5,000-$15,000/month from affiliate commissions

---

## Current ML Capabilities (Phase 5 + Phase 14)

### Existing Models (8)
1. **Gemini 2.0 Flash** - Transaction categorization
2. **Gemini 2.5 Flash** - Receipt OCR
3. **Gemini 2.0 Flash Thinking** - Location insights
4. **DistilBERT** - Semantic search (planned, not implemented)
5. **HuggingFace Inference** - Backup categorization
6. **Tesseract.js** - Receipt text extraction
7. **Basic Anomaly Detection** - Rule-based threshold alerts
8. **ML Training Dashboard** - Model registry & A/B testing (Phase 14)

### Current Limitations
- No reinforcement learning (budget optimization)
- No clustering (geofence optimization)
- No learning-to-rank (deal personalization)
- No time-series forecasting (spending predictions)
- No revenue generation (affiliate integrations)

---

## Phase 15 Advanced ML Models

### 1. Multi-Armed Bandits (Thompson Sampling) - Budget Allocation (Week 47)

**Problem:** Users don't know optimal budget allocation across categories

**Solution:** Thompson Sampling to dynamically allocate budgets based on spending patterns

**Use Case:**
```
User has $1,000 monthly budget. MAB algorithm learns:
- Groceries: $400 (high frequency, low variance)
- Dining: $250 (medium frequency, medium variance)
- Entertainment: $200 (low frequency, high variance)
- Gas: $150 (stable, predictable)
```

**Implementation:**
```typescript
// supabase/functions/optimize-budget/index.ts
interface BudgetArm {
  category: string;
  alpha: number; // Beta distribution parameter
  beta: number;
}

class ThompsonSamplingBudgetOptimizer {
  async allocate(userId: string, totalBudget: number) {
    // Get historical spending
    const history = await this.getSpendingHistory(userId);
    
    // Initialize arms (categories)
    const arms = this.initializeArms(history);
    
    // Thompson Sampling: Sample from Beta distributions
    const samples = arms.map(arm => ({
      category: arm.category,
      sample: this.betaSample(arm.alpha, arm.beta)
    }));
    
    // Allocate budget proportionally
    const totalSample = samples.reduce((sum, s) => sum + s.sample, 0);
    return samples.map(s => ({
      category: s.category,
      amount: (s.sample / totalSample) * totalBudget,
      confidence: this.calculateConfidence(s.sample)
    }));
  }
  
  betaSample(alpha: number, beta: number): number {
    // Beta distribution sampling using Gamma functions
    const x = this.gammaSample(alpha, 1);
    const y = this.gammaSample(beta, 1);
    return x / (x + y);
  }
}
```

**Database Tables:**
```sql
CREATE TABLE budget_optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  category TEXT NOT NULL,
  allocated_amount NUMERIC NOT NULL,
  actual_spent NUMERIC NOT NULL,
  reward NUMERIC NOT NULL, -- (1 - overspend_penalty)
  alpha NUMERIC NOT NULL,
  beta NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_optimization_user_category 
  ON budget_optimization_history(user_id, category, timestamp DESC);
```

**Expected Impact:**
- Reduce budget overspending by 35%
- Improve budget adherence score from 72% to 88%
- Increase user satisfaction (fewer budget alerts)

---

### 2. K-Means++ Clustering - Geofence Optimization (Week 47)

**Problem:** Users manually create geofences in suboptimal locations

**Solution:** K-Means++ to cluster spending locations and suggest optimal geofence placements

**Use Case:**
```
User spends at 50 different locations.
K-Means++ identifies 5 clusters:
1. Home area (15 transactions, avg $45)
2. Work area (20 transactions, avg $12)
3. Shopping district (8 transactions, avg $120)
4. Gym area (4 transactions, avg $30)
5. Restaurant district (3 transactions, avg $65)

Suggest 5 geofences covering 90% of transactions.
```

**Implementation:**
```typescript
// supabase/functions/optimize-geofences/index.ts
import { KMeans } from 'ml-kmeans';

interface LocationCluster {
  center: { lat: number; lng: number };
  radius: number;
  transactionCount: number;
  avgSpending: number;
}

class GeofenceOptimizer {
  async suggestGeofences(userId: string, k: number = 5): Promise<LocationCluster[]> {
    // Get user transactions with location
    const transactions = await supabase
      .from('transactions')
      .select('location_lat, location_lng, amount')
      .eq('user_id', userId)
      .not('location_lat', 'is', null);
    
    // Prepare data for K-Means
    const points = transactions.data.map(t => [t.location_lat, t.location_lng]);
    
    // K-Means++ initialization
    const kmeans = new KMeans({ k, initialization: 'kmeans++' });
    const result = kmeans.predict(points);
    
    // Calculate cluster statistics
    return result.centroids.map((centroid, idx) => {
      const clusterTransactions = transactions.data.filter((_, i) => result.clusters[i] === idx);
      return {
        center: { lat: centroid[0], lng: centroid[1] },
        radius: this.calculateOptimalRadius(clusterTransactions),
        transactionCount: clusterTransactions.length,
        avgSpending: clusterTransactions.reduce((sum, t) => sum + t.amount, 0) / clusterTransactions.length
      };
    });
  }
  
  calculateOptimalRadius(transactions: any[]): number {
    // 90th percentile distance from centroid
    const distances = transactions.map(t => 
      this.haversineDistance(t.location_lat, t.location_lng, centroid)
    ).sort((a, b) => a - b);
    
    return distances[Math.floor(distances.length * 0.9)];
  }
}
```

**Database Tables:**
```sql
CREATE TABLE geofence_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  suggested_geofences JSONB NOT NULL, -- Array of clusters
  coverage_percentage NUMERIC, -- % of transactions covered
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted BOOLEAN DEFAULT false
);
```

**Expected Impact:**
- Increase geofence coverage from 60% to 90% of transactions
- Reduce manual geofence creation time by 80%
- Improve location-based budget tracking accuracy

---

### 3. LambdaMART - Offer Ranking (Week 48)

**Problem:** Show all deals to all users, causing alert fatigue

**Solution:** LambdaMART (Learning-to-Rank) to personalize deal notifications

**Use Case:**
```
User receives 20 deal notifications per week.
LambdaMART learns:
- User clicks on grocery deals (30% CTR)
- User ignores restaurant deals (2% CTR)
- User clicks on gas deals only on Thursdays (15% CTR)

Personalized ranking:
1. Grocery deal (0.85 relevance)
2. Gas deal - Thursday (0.72 relevance)
3. Coffee shop deal (0.45 relevance)
4. Restaurant deal (0.12 relevance) ← Hidden
```

**Implementation:**
```typescript
// supabase/functions/rank-deals/index.ts
import LightGBM from 'lightgbm'; // Modal.com runtime

interface DealFeatures {
  category: string;
  discount_percentage: number;
  distance_meters: number;
  day_of_week: number;
  time_of_day: number;
  user_category_affinity: number;
  user_merchant_affinity: number;
  historical_ctr: number;
}

class DealRanker {
  async rankDeals(userId: string, deals: Deal[]): Promise<RankedDeal[]> {
    // Load trained LambdaMART model
    const model = await this.loadModel('lambdamart-deal-ranking-v1');
    
    // Extract features for each deal
    const features = await Promise.all(
      deals.map(deal => this.extractFeatures(userId, deal))
    );
    
    // Predict relevance scores
    const scores = model.predict(features);
    
    // Rank and filter
    return deals
      .map((deal, idx) => ({ ...deal, relevance: scores[idx] }))
      .sort((a, b) => b.relevance - a.relevance)
      .filter(d => d.relevance > 0.3); // Threshold
  }
  
  async extractFeatures(userId: string, deal: Deal): Promise<DealFeatures> {
    const user = await this.getUserProfile(userId);
    const history = await this.getDealClickHistory(userId);
    
    return {
      category: deal.category,
      discount_percentage: deal.discount,
      distance_meters: this.calculateDistance(user.location, deal.location),
      day_of_week: new Date().getDay(),
      time_of_day: new Date().getHours(),
      user_category_affinity: this.calculateAffinity(user, deal.category),
      user_merchant_affinity: this.calculateMerchantAffinity(user, deal.merchant),
      historical_ctr: this.getHistoricalCTR(deal.category)
    };
  }
}
```

**Training Pipeline (Modal.com):**
```python
# modal/train_lambdamart.py
import lightgbm as lgb
import pandas as pd

@stub.function(image=image, gpu="any")
def train_lambdamart(training_data_url: str):
    # Load training data
    df = pd.read_csv(training_data_url)
    
    # Prepare features
    X = df[['category_encoded', 'discount_pct', 'distance', 'day', 'time', ...]]
    y = df['clicked'] # Binary: clicked (1) or ignored (0)
    qid = df['query_id'] # Group by user_id + timestamp
    
    # Train LambdaMART
    model = lgb.LGBMRanker(
        objective='lambdarank',
        metric='ndcg',
        boosting_type='gbdt',
        num_leaves=31,
        learning_rate=0.05,
        n_estimators=100
    )
    
    model.fit(X, y, group=qid)
    
    # Save to Supabase storage
    model.save_model('models/lambdamart-deal-ranking-v1.txt')
    
    return {'status': 'success', 'ndcg@10': model.best_score_}
```

**Database Tables:**
```sql
CREATE TABLE deal_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  deal_id UUID,
  clicked BOOLEAN DEFAULT false,
  relevance_score NUMERIC,
  features JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_clicks_user_timestamp 
  ON deal_clicks(user_id, timestamp DESC);
```

**Expected Impact:**
- Increase deal click-through rate from 8% to 25%
- Reduce notification fatigue (show 5 deals instead of 20)
- Improve affiliate conversion rate by 3x

---

### 4. Prophet - Time-Series Forecasting (Week 48)

**Problem:** Users don't know future spending patterns

**Solution:** Facebook Prophet for spending forecasts

**Use Case:**
```
User spent $2,500 last month.
Prophet predicts:
- Next month: $2,650 (trend: +6%)
- Seasonal pattern: +15% in December (holidays)
- Anomaly detected: Predicted $2,650, but trajectory shows $3,200

Alert: "You're on track to overspend by $550 this month"
```

**Implementation:**
```python
# modal/forecast_spending.py
from prophet import Prophet
import pandas as pd

@stub.function(image=image)
def forecast_spending(user_id: str, horizon_days: int = 30):
    # Load historical data
    df = load_user_transactions(user_id)
    
    # Prepare Prophet format
    prophet_df = pd.DataFrame({
        'ds': df['timestamp'],
        'y': df['amount']
    })
    
    # Train Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05
    )
    
    model.fit(prophet_df)
    
    # Make forecast
    future = model.make_future_dataframe(periods=horizon_days)
    forecast = model.predict(future)
    
    # Extract predictions
    return {
        'predicted_spending': forecast['yhat'].tail(horizon_days).sum(),
        'lower_bound': forecast['yhat_lower'].tail(horizon_days).sum(),
        'upper_bound': forecast['yhat_upper'].tail(horizon_days).sum(),
        'trend': forecast['trend'].iloc[-1],
        'seasonality': forecast['yearly'].iloc[-1] + forecast['weekly'].iloc[-1]
    }
```

**Database Tables:**
```sql
CREATE TABLE spending_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  forecast_date DATE NOT NULL,
  predicted_amount NUMERIC NOT NULL,
  lower_bound NUMERIC NOT NULL,
  upper_bound NUMERIC NOT NULL,
  actual_amount NUMERIC,
  forecast_accuracy NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Expected Impact:**
- Proactive budget alerts (before overspending)
- Improve budget adherence from 72% to 85%
- Increase user engagement (daily forecast widget)

---

### 5. Collaborative Filtering (ALS) - Recommendation Engine (Week 49)

**Problem:** Users miss deals from merchants they might like

**Solution:** Alternating Least Squares (ALS) for merchant recommendations

**Use Case:**
```
User A shops at: Whole Foods, Trader Joe's, Starbucks
User B shops at: Whole Foods, Trader Joe's, Blue Bottle Coffee
User C shops at: Whole Foods, Starbucks, Peet's Coffee

ALS learns:
- User A similar to User B (85% similarity)
- Suggest to User A: Blue Bottle Coffee (not yet visited)
```

**Implementation:**
```python
# modal/train_als.py
from implicit.als import AlternatingLeastSquares
import scipy.sparse as sp

@stub.function(image=image)
def train_als(interaction_matrix_url: str):
    # Load user-merchant interaction matrix
    # Rows: users, Columns: merchants, Values: transaction frequency
    interactions = load_sparse_matrix(interaction_matrix_url)
    
    # Train ALS model
    model = AlternatingLeastSquares(
        factors=50,
        regularization=0.01,
        iterations=15,
        use_gpu=True
    )
    
    model.fit(interactions)
    
    # Save user/merchant embeddings
    user_embeddings = model.user_factors
    merchant_embeddings = model.item_factors
    
    save_embeddings('user_embeddings_v1.npy', user_embeddings)
    save_embeddings('merchant_embeddings_v1.npy', merchant_embeddings)
    
    return {'status': 'success', 'factors': 50}
```

**Database Tables:**
```sql
CREATE TABLE merchant_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  merchant_id UUID,
  similarity_score NUMERIC NOT NULL,
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT false
);
```

**Expected Impact:**
- Discover 10+ new merchants per user
- Increase transaction diversity by 40%
- Boost affiliate revenue (new merchant visits)

---

### 6. Hybrid NLP (DistilBERT + Gemini) - Semantic Search (Week 49)

**Problem:** Keyword search misses semantically similar transactions

**Solution:** DistilBERT embeddings for semantic transaction search

**Use Case:**
```
Search: "coffee"
Keyword match: "Starbucks Coffee", "Peet's Coffee"
Semantic match: "Dunkin' Donuts" (breakfast), "Blue Bottle" (cafe)
```

**Implementation:**
```typescript
// supabase/functions/semantic-search/index.ts
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGING_FACE_ACCESS_TOKEN);

async function semanticSearch(query: string, userId: string) {
  // Generate query embedding
  const queryEmbedding = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: query
  });
  
  // Search in vector database
  const results = await supabase.rpc('match_transactions', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 20,
    user_id: userId
  });
  
  return results.data;
}
```

**Database Changes:**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE transactions 
  ADD COLUMN embedding vector(384);

-- Create index for similarity search
CREATE INDEX ON transactions 
  USING ivfflat (embedding vector_cosine_ops);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  merchant text,
  category text,
  amount numeric,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    id,
    merchant,
    category,
    amount,
    1 - (embedding <=> query_embedding) as similarity
  FROM transactions
  WHERE user_id = match_transactions.user_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

**Expected Impact:**
- Improve search relevance by 60%
- Discover "hidden" spending patterns
- Better transaction categorization

---

### 7. Reinforcement Learning (DQN) - Cache Policy (Week 49)

**Problem:** Static cache TTLs are suboptimal

**Solution:** Deep Q-Network (DQN) for adaptive cache policy

**Implementation:**
```python
# modal/train_dqn_cache.py
import torch
import torch.nn as nn

class CachePolicyNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(10, 128) # State: 10 features
        self.fc2 = nn.Linear(128, 64)
        self.fc3 = nn.Linear(64, 5) # Actions: TTL {1m, 5m, 15m, 1h, 24h}
    
    def forward(self, state):
        x = torch.relu(self.fc1(state))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)

@stub.function(image=image, gpu="T4")
def train_dqn_cache():
    # Train DQN to optimize cache TTL
    # Reward: cache_hit_rate - (cost_of_storage * 0.1)
    pass
```

**Expected Impact:**
- Cache hit rate: 93% → 97%
- Reduced cache storage costs by 20%

---

## Layer 10B: Deals & Cashback Gateway (Revenue Generation)

### Architecture
```
User Transaction → Geofence Entry → Match with Affiliate Network → 
Present Deal → User Clicks → Affiliate Conversion → Commission
```

### Affiliate Integrations
1. **Rakuten LinkShare** (10,000+ merchants, 2-8% commission)
2. **CJ Affiliate** (5,000+ merchants, 3-10% commission)
3. **Impact.com** (3,000+ merchants, 5-15% commission)
4. **Pepperjam** (2,000+ merchants, 4-12% commission)

### Revenue Model
```
Average Transaction: $75
Conversion Rate: 3% (optimized with LambdaMART)
Average Commission: 5%
Monthly Active Users: 10,000

Monthly Revenue = 10,000 users × 20 deals/month × 3% CTR × $75 × 5%
                = 10,000 × 20 × 0.03 × 75 × 0.05
                = $22,500/month

Conservative Estimate: $5,000-$10,000/month
Optimistic Estimate: $15,000-$25,000/month
```

### Database Tables
```sql
CREATE TABLE affiliate_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name TEXT NOT NULL,
  merchant_id UUID,
  affiliate_network TEXT NOT NULL, -- 'rakuten', 'cj', 'impact', 'pepperjam'
  affiliate_link TEXT NOT NULL,
  discount_percentage NUMERIC,
  cashback_percentage NUMERIC,
  category TEXT,
  geofence_id UUID REFERENCES geofences(id),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  deal_id UUID REFERENCES affiliate_deals(id),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  commission_earned NUMERIC,
  status TEXT DEFAULT 'pending' -- 'pending', 'confirmed', 'paid'
);
```

---

## Implementation Timeline

### Week 47: Optimization ML
- Multi-Armed Bandits (Thompson Sampling)
- K-Means++ Clustering

### Week 48: Ranking & Forecasting
- LambdaMART (Deal Ranking)
- Prophet (Time-Series Forecasting)

### Week 49: Recommendations & Revenue
- Collaborative Filtering (ALS)
- Hybrid NLP (DistilBERT + Gemini)
- RL Cache Policy (DQN)
- Layer 10B (Affiliate Gateway)

---

## Cost Estimate

### ML Training Costs (Modal.com)
- LambdaMART training: $5/month
- ALS training: $3/month
- DQN training: $10/month (GPU)
- Prophet forecasting: $2/month
- **Total:** $20/month

### Affiliate API Costs
- Rakuten API: Free
- CJ Affiliate API: Free
- Impact.com API: Free
- **Total:** $0/month

### Net Revenue
- Revenue: $5,000-$15,000/month
- Costs: $20/month
- **Net Profit:** $4,980-$14,980/month

**ROI:** 250x-750x

---

## Success Metrics

### ML Performance
- Budget allocation accuracy: >85%
- Geofence coverage: >90%
- Deal CTR: >25%
- Forecast MAPE: <15%
- Recommendation precision: >70%

### Revenue Metrics
- Affiliate conversions: >300/month
- Commission revenue: $5,000-$15,000/month
- User engagement: +40% active users

---

## Conclusion

**Phase 15 is well-planned but not started (0%).** This phase will transform TrueSpend from a tracking app to an **intelligent financial assistant with revenue generation**.

**Recommendation:** Prioritize Phase 15 in Q2 2025 after MVP launch and Phase 14 validation.
