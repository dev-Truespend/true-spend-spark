-- Create user_consents table for audit trail
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Policy versions
  terms_version TEXT NOT NULL DEFAULT '1.0',
  privacy_version TEXT NOT NULL DEFAULT '1.0',
  data_processing_version TEXT NOT NULL DEFAULT '1.0',
  ai_policy_version TEXT NOT NULL DEFAULT '1.0',
  affiliate_policy_version TEXT NOT NULL DEFAULT '1.0',
  consent_policy_version TEXT NOT NULL DEFAULT '1.0',
  
  -- Consent flags (all required)
  accepted_terms BOOLEAN NOT NULL DEFAULT false,
  accepted_privacy BOOLEAN NOT NULL DEFAULT false,
  consent_data_processing BOOLEAN NOT NULL DEFAULT false,
  consent_ai BOOLEAN NOT NULL DEFAULT false,
  consent_affiliate_transparency BOOLEAN NOT NULL DEFAULT false,
  consent_emails BOOLEAN NOT NULL DEFAULT false,
  consent_info_accuracy BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit trail
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create consent_audit_log for change tracking
CREATE TABLE IF NOT EXISTS public.consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_id UUID NOT NULL REFERENCES user_consents(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'created', 'updated', 'withdrawn'
  changed_fields JSONB,
  previous_values JSONB,
  new_values JSONB,
  
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_consents
CREATE POLICY "Users can view own consents"
  ON public.user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert consents"
  ON public.user_consents
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all consents"
  ON public.user_consents
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own consents"
  ON public.user_consents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for consent_audit_log
CREATE POLICY "Users can view own audit log"
  ON public.consent_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log"
  ON public.consent_audit_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all audit logs"
  ON public.consent_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_timestamp ON public.user_consents(consent_timestamp);
CREATE INDEX idx_consent_audit_log_user_id ON public.consent_audit_log(user_id);
CREATE INDEX idx_consent_audit_log_consent_id ON public.consent_audit_log(consent_id);
CREATE INDEX idx_consent_audit_log_timestamp ON public.consent_audit_log(timestamp);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_consents_updated_at();