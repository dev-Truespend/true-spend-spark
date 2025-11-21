-- Create storage bucket for ML models
INSERT INTO storage.buckets (id, name, public)
VALUES ('ml-models', 'ml-models', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for ML models bucket
CREATE POLICY "Admin users can upload ML models"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ml-models' 
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can read ML models"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ml-models'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "System can manage ML models"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'ml-models')
  WITH CHECK (bucket_id = 'ml-models');

-- Create training data bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-data', 'training-data', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for training data bucket
CREATE POLICY "Admin users can upload training data"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'training-data'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can read training data"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'training-data'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );