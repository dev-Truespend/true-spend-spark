-- Create platform_features table for tracking user-facing features across platforms
CREATE TABLE platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'extension', 'mobile')),
  category TEXT, -- 'auth', 'rewards', 'ai', 'cashback', 'geofence', 'privacy', 'wallet', 'performance', 'integration'
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'complete')),
  icon TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view platform features"
  ON platform_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage platform features"
  ON platform_features FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_platform_features_phase ON platform_features(phase_id);
CREATE INDEX idx_platform_features_platform ON platform_features(platform);
CREATE INDEX idx_platform_features_status ON platform_features(status);
CREATE INDEX idx_platform_features_category ON platform_features(category);

-- Trigger for updated_at
CREATE TRIGGER update_platform_features_updated_at
  BEFORE UPDATE ON platform_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed data for 15 phases across 3 platforms (~110 features total)

-- Phase 1: Foundation & Client Layer
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Login & Signup', 'User authentication with email/password', 'web', 'auth', 'LogIn', 1, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'User Profile', 'View and edit profile information', 'web', 'auth', 'User', 2, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'Manual Card Add', 'Add credit cards manually', 'web', 'rewards', 'CreditCard', 3, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'Dashboard (Basic)', 'View spending overview', 'web', 'rewards', 'LayoutDashboard', 4, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'Auth Flow', 'Mobile authentication', 'mobile', 'auth', 'Smartphone', 1, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'GPS Permission', 'Request location permissions', 'mobile', 'geofence', 'MapPin', 2, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'Install & Setup', 'Browser extension installation', 'extension', 'auth', 'Puzzle', 1, 'complete' FROM phases WHERE phase_number = 1
UNION ALL
SELECT id, 'Domain Detection', 'Detect current merchant', 'extension', 'rewards', 'Globe', 2, 'complete' FROM phases WHERE phase_number = 1;

-- Phase 2: Security & Ingress Layer
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Two-Factor Auth', 'Enable 2FA for account security', 'web', 'auth', 'Shield', 1, 'in_progress' FROM phases WHERE phase_number = 2
UNION ALL
SELECT id, 'Privacy Settings', 'Manage data privacy preferences', 'web', 'privacy', 'Lock', 2, 'in_progress' FROM phases WHERE phase_number = 2
UNION ALL
SELECT id, 'Data Export', 'Export personal data', 'web', 'privacy', 'Download', 3, 'planned' FROM phases WHERE phase_number = 2
UNION ALL
SELECT id, 'Biometric Auth', 'Fingerprint/Face ID login', 'mobile', 'auth', 'Fingerprint', 1, 'in_progress' FROM phases WHERE phase_number = 2
UNION ALL
SELECT id, 'Secure PIN', 'Set app PIN protection', 'mobile', 'auth', 'Lock', 2, 'planned' FROM phases WHERE phase_number = 2
UNION ALL
SELECT id, 'Permission Panel', 'View extension permissions', 'extension', 'privacy', 'Shield', 1, 'planned' FROM phases WHERE phase_number = 2;

-- Phase 3: Geofencing & Location
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Geofence Zone Creator', 'Create custom spending zones', 'web', 'geofence', 'Map', 1, 'in_progress' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Zone Rules', 'Set budget rules for zones', 'web', 'geofence', 'MapPin', 2, 'planned' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Zone Analytics', 'View spending by location', 'web', 'geofence', 'BarChart', 3, 'planned' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Plaid Bank Linking', 'Connect bank accounts', 'web', 'integration', 'Link', 4, 'planned' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Transaction Sync', 'Auto-sync bank transactions', 'web', 'rewards', 'RefreshCw', 5, 'planned' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Auto-detect Zones', 'Automatic zone detection', 'mobile', 'geofence', 'Navigation', 1, 'in_progress' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Geo Alerts', 'Location-based spending alerts', 'mobile', 'geofence', 'Bell', 2, 'planned' FROM phases WHERE phase_number = 3
UNION ALL
SELECT id, 'Background Tracking', 'Continuous location monitoring', 'mobile', 'geofence', 'Radar', 3, 'planned' FROM phases WHERE phase_number = 3;

-- Phase 4: Authentication & Layer 5
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Social Login', 'Login with Google/Apple', 'web', 'auth', 'Users', 1, 'planned' FROM phases WHERE phase_number = 4
UNION ALL
SELECT id, 'Session Management', 'View active sessions', 'web', 'auth', 'Monitor', 2, 'planned' FROM phases WHERE phase_number = 4
UNION ALL
SELECT id, 'Password Reset', 'Secure password recovery', 'web', 'auth', 'Key', 3, 'planned' FROM phases WHERE phase_number = 4
UNION ALL
SELECT id, 'Social Login', 'Login with Google/Apple', 'mobile', 'auth', 'Users', 1, 'planned' FROM phases WHERE phase_number = 4
UNION ALL
SELECT id, 'Quick Login', 'Fast authentication', 'extension', 'auth', 'Zap', 1, 'planned' FROM phases WHERE phase_number = 4;

-- Phase 5: Core Services & BFF
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Best Card Engine', 'Recommend best card per purchase', 'web', 'rewards', 'Sparkles', 1, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'TrueSpend Score', 'Track reward optimization score', 'web', 'rewards', 'Award', 2, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Transaction History', 'View all transactions', 'web', 'rewards', 'History', 3, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Card Portfolio', 'Manage all credit cards', 'web', 'rewards', 'Wallet', 4, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Realtime Sync', 'Live transaction updates', 'mobile', 'rewards', 'Zap', 1, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Spend Alerts', 'Real-time spending notifications', 'mobile', 'rewards', 'AlertCircle', 2, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Quick Add Transaction', 'Fast transaction entry', 'mobile', 'rewards', 'PlusCircle', 3, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Popup Card Suggest', 'Show best card in popup', 'extension', 'rewards', 'CreditCard', 1, 'planned' FROM phases WHERE phase_number = 5
UNION ALL
SELECT id, 'Quick Expense Log', 'Fast transaction entry', 'extension', 'rewards', 'PlusCircle', 2, 'planned' FROM phases WHERE phase_number = 5;

-- Phase 6: Logic & AI Layer (v1)
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Smart Recommendations', 'AI-powered card suggestions', 'web', 'ai', 'Brain', 1, 'planned' FROM phases WHERE phase_number = 6
UNION ALL
SELECT id, 'Spending Insights', 'AI spending analysis', 'web', 'ai', 'TrendingUp', 2, 'planned' FROM phases WHERE phase_number = 6
UNION ALL
SELECT id, 'Category Detection', 'Auto-categorize transactions', 'web', 'ai', 'Tag', 3, 'planned' FROM phases WHERE phase_number = 6
UNION ALL
SELECT id, 'AI Card Suggest', 'Real-time AI recommendations', 'mobile', 'ai', 'Brain', 1, 'planned' FROM phases WHERE phase_number = 6
UNION ALL
SELECT id, 'Smart Notifications', 'AI-driven alerts', 'mobile', 'ai', 'Bell', 2, 'planned' FROM phases WHERE phase_number = 6
UNION ALL
SELECT id, 'Merchant Detection', 'Auto-identify merchant', 'extension', 'ai', 'Store', 1, 'planned' FROM phases WHERE phase_number = 6;

-- Phase 7: External Communication (Egress)
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Multi-Bank Support', 'Connect multiple banks', 'web', 'integration', 'Building', 1, 'planned' FROM phases WHERE phase_number = 7
UNION ALL
SELECT id, 'Transaction Categories', 'Categorized spending view', 'web', 'rewards', 'FolderTree', 2, 'planned' FROM phases WHERE phase_number = 7
UNION ALL
SELECT id, 'Spending Trends', 'Monthly/yearly trends', 'web', 'rewards', 'LineChart', 3, 'planned' FROM phases WHERE phase_number = 7
UNION ALL
SELECT id, 'Bank Sync', 'Mobile bank sync', 'mobile', 'integration', 'RefreshCw', 1, 'planned' FROM phases WHERE phase_number = 7
UNION ALL
SELECT id, 'Category View', 'Spending by category', 'mobile', 'rewards', 'PieChart', 2, 'planned' FROM phases WHERE phase_number = 7;

-- Phase 8: Location Intelligence
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Location History', 'View spending location history', 'web', 'geofence', 'MapPin', 1, 'planned' FROM phases WHERE phase_number = 8
UNION ALL
SELECT id, 'Merchant Map', 'Map view of merchants', 'web', 'geofence', 'Map', 2, 'planned' FROM phases WHERE phase_number = 8
UNION ALL
SELECT id, 'Heat Map', 'Spending heat map', 'web', 'geofence', 'Flame', 3, 'planned' FROM phases WHERE phase_number = 8
UNION ALL
SELECT id, 'Nearby Deals', 'Location-based offers', 'mobile', 'geofence', 'Compass', 1, 'planned' FROM phases WHERE phase_number = 8
UNION ALL
SELECT id, 'Check-in Rewards', 'Location check-in bonuses', 'mobile', 'rewards', 'MapPin', 2, 'planned' FROM phases WHERE phase_number = 8;

-- Phase 9: Data Plane & Messaging
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Notifications Center', 'View all notifications', 'web', 'rewards', 'Bell', 1, 'planned' FROM phases WHERE phase_number = 9
UNION ALL
SELECT id, 'Email Alerts', 'Email notification settings', 'web', 'rewards', 'Mail', 2, 'planned' FROM phases WHERE phase_number = 9
UNION ALL
SELECT id, 'Push Notifications', 'Mobile push alerts', 'mobile', 'rewards', 'Bell', 1, 'planned' FROM phases WHERE phase_number = 9
UNION ALL
SELECT id, 'SMS Alerts', 'Text message alerts', 'mobile', 'rewards', 'MessageSquare', 2, 'planned' FROM phases WHERE phase_number = 9;

-- Phase 10: Optimization & Backup
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Performance Dashboard', 'View optimization metrics', 'web', 'performance', 'Gauge', 1, 'planned' FROM phases WHERE phase_number = 10
UNION ALL
SELECT id, 'Data Backup', 'Automatic data backup', 'web', 'privacy', 'Database', 2, 'planned' FROM phases WHERE phase_number = 10
UNION ALL
SELECT id, 'Fast Load', 'Optimized loading times', 'mobile', 'performance', 'Zap', 1, 'planned' FROM phases WHERE phase_number = 10
UNION ALL
SELECT id, 'Offline Mode', 'Work without internet', 'mobile', 'performance', 'WifiOff', 2, 'planned' FROM phases WHERE phase_number = 10
UNION ALL
SELECT id, 'Quick Load', 'Fast extension startup', 'extension', 'performance', 'Zap', 1, 'planned' FROM phases WHERE phase_number = 10;

-- Phase 11: Browser Extension Deep Integration
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Verified Coupons', 'Auto-apply valid coupons', 'extension', 'cashback', 'Tag', 1, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Cashback Tracking', 'Track cashback earnings', 'extension', 'cashback', 'DollarSign', 2, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Price Comparison', 'Compare prices across sites', 'extension', 'rewards', 'TrendingDown', 3, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Auto-fill Cards', 'Auto-fill payment info', 'extension', 'rewards', 'CreditCard', 4, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Cart Tracking', 'Track shopping carts', 'extension', 'rewards', 'ShoppingCart', 5, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Coupon Feed', 'Browse available coupons', 'web', 'cashback', 'Gift', 1, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Cashback History', 'View cashback earnings', 'web', 'cashback', 'History', 2, 'planned' FROM phases WHERE phase_number = 11
UNION ALL
SELECT id, 'Offer Alerts', 'Mobile offer notifications', 'mobile', 'cashback', 'Bell', 1, 'planned' FROM phases WHERE phase_number = 11;

-- Phase 12: Observability Layer
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Account Health', 'View account status', 'web', 'performance', 'Activity', 1, 'planned' FROM phases WHERE phase_number = 12
UNION ALL
SELECT id, 'Usage Statistics', 'Personal usage stats', 'web', 'rewards', 'BarChart3', 2, 'planned' FROM phases WHERE phase_number = 12
UNION ALL
SELECT id, 'App Health', 'Mobile app diagnostics', 'mobile', 'performance', 'Heart', 1, 'planned' FROM phases WHERE phase_number = 12;

-- Phase 13: Performance Optimization
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Lightning Fast Search', 'Instant transaction search', 'web', 'performance', 'Search', 1, 'planned' FROM phases WHERE phase_number = 13
UNION ALL
SELECT id, 'Instant Load', 'Sub-second page loads', 'web', 'performance', 'Zap', 2, 'planned' FROM phases WHERE phase_number = 13
UNION ALL
SELECT id, 'Smart Caching', 'Intelligent data caching', 'web', 'performance', 'Database', 3, 'planned' FROM phases WHERE phase_number = 13
UNION ALL
SELECT id, 'Ultra-fast Launch', 'Instant app startup', 'mobile', 'performance', 'Rocket', 1, 'planned' FROM phases WHERE phase_number = 13
UNION ALL
SELECT id, 'Battery Optimization', 'Extended battery life', 'mobile', 'performance', 'Battery', 2, 'planned' FROM phases WHERE phase_number = 13
UNION ALL
SELECT id, 'Zero Lag', 'Instant popup response', 'extension', 'performance', 'Zap', 1, 'planned' FROM phases WHERE phase_number = 13;

-- Phase 14: ML Infrastructure & Advanced AI
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'AI Advisor', 'Personalized financial advice', 'web', 'ai', 'Bot', 1, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'Predictive Insights', 'Forecast future spending', 'web', 'ai', 'TrendingUp', 2, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'Portfolio Optimizer', 'Optimize card portfolio', 'web', 'ai', 'Target', 3, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'Smart Goals', 'AI-powered savings goals', 'web', 'ai', 'Goal', 4, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'Voice Coach', 'Voice-activated AI assistant', 'mobile', 'ai', 'Mic', 1, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'Goal Tracking', 'Track financial goals', 'mobile', 'rewards', 'Target', 2, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'AI Auto-Switch', 'Auto-select best card', 'mobile', 'ai', 'Shuffle', 3, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'Adaptive Popup', 'Context-aware suggestions', 'extension', 'ai', 'Brain', 1, 'planned' FROM phases WHERE phase_number = 14
UNION ALL
SELECT id, 'AI Ranking', 'ML-powered card ranking', 'extension', 'ai', 'Award', 2, 'planned' FROM phases WHERE phase_number = 14;

-- Phase 15: Layer 10B - Revenue & Smart Wallet
INSERT INTO platform_features (phase_id, feature_name, feature_description, platform, category, icon, priority, status)
SELECT id, 'Smart Wallet', 'Unified payment wallet', 'web', 'wallet', 'Wallet', 1, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Family Rewards', 'Share rewards with family', 'web', 'rewards', 'Users', 2, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'ESG Dashboard', 'Sustainable spending tracking', 'web', 'rewards', 'Leaf', 3, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Merchant Partnerships', 'Exclusive merchant deals', 'web', 'cashback', 'Handshake', 4, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Rewards Marketplace', 'Redeem rewards', 'web', 'rewards', 'Store', 5, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Smart Wallet', 'Mobile payment wallet', 'mobile', 'wallet', 'Wallet', 1, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Family Hub', 'Family rewards management', 'mobile', 'rewards', 'Users', 2, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Green Score', 'Track eco-friendly purchases', 'mobile', 'rewards', 'Leaf', 3, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Auto-routing', 'Automatic payment routing', 'extension', 'wallet', 'GitBranch', 1, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Price Alerts', 'Track price drops', 'extension', 'rewards', 'TrendingDown', 2, 'planned' FROM phases WHERE phase_number = 15
UNION ALL
SELECT id, 'Deal Finder', 'Auto-find best deals', 'extension', 'cashback', 'Search', 3, 'planned' FROM phases WHERE phase_number = 15;