// Phase 7: Location Analytics Types

export interface LocationAnalytics {
  geofence_id: string;
  geofence_name: string;
  total_spent: number;
  transaction_count: number;
  avg_transaction: number;
  categories: Record<string, number>;
  last_visit?: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  category?: string;
  amount_spent: number;
  period_start: string;
  period_end: string;
}

export interface LocationInsight {
  id: string;
  title: string;
  description: string;
  insight_type: 'savings_opportunity' | 'spending_alert' | 'budget_recommendation' | 'pattern_detected';
  priority: 'low' | 'medium' | 'high';
  confidence_score: number;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
  actioned: boolean;
}

export interface LocationRecommendation {
  id: string;
  recommendation_type: 'budget_adjustment' | 'alternative_merchant' | 'deal_alert';
  rationale: string;
  current_value?: number;
  recommended_value?: number;
  potential_savings?: number;
  geofence_id?: string;
  data_points_analyzed: number;
  created_at: string;
  expires_at?: string;
  accepted: boolean;
}

export interface MerchantRecommendation {
  id: string;
  merchant_id: string;
  merchant_name: string;
  category?: string;
  rating?: number;
  price_tier?: number;
  distance?: number;
  deal_type?: 'discount' | 'loyalty' | 'seasonal' | 'first_time' | 'time_limited';
  deal_description?: string;
  potential_savings?: number;
  address?: string;
  lat?: number;
  lng?: number;
  recommendation_reason: string;
  confidence_score: number;
}

export interface LocationAnalyticsBFFResponse {
  analytics: LocationAnalytics[];
  heatmap_data: HeatmapPoint[];
  insights: LocationInsight[];
  recommendations: LocationRecommendation[];
  merchant_recommendations?: MerchantRecommendation[];
  period_days: number;
  generated_at: string;
}

export interface GeofenceMetric {
  id: string;
  metric_name: string;
  metric_type: 'location_accuracy' | 'ai_insight_quality' | 'cache_performance' | 'merchant_engagement';
  value: number;
  unit: string;
  timestamp: string;
  geofence_id?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}
