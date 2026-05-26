import type { NormalizedCategory } from './rewards';

export interface MerchantDomain {
  id: string;
  domain: string;
  merchant_name: string;
  normalized_category: NormalizedCategory | string;
  subcategory?: string | null;
  confidence_score: number;
  detection_source: 'manual' | 'ai' | 'plaid' | 'google_places' | 'user_report' | 'seed';
  is_verified: boolean;
}

export interface MerchantResolution {
  status: 'known' | 'unknown';
  merchant?: Pick<MerchantDomain, 'domain' | 'merchant_name' | 'normalized_category' | 'confidence_score'>;
}
