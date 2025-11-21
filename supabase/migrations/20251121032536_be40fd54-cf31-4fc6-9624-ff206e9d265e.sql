-- Create ml-training-data storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ml-training-data', 'ml-training-data', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for ml-training-data bucket

-- Policy: Admins can view all training data files
CREATE POLICY "Admins can view all training data files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ml-training-data' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can upload training data files
CREATE POLICY "Admins can upload training data files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ml-training-data' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can update training data files
CREATE POLICY "Admins can update training data files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ml-training-data' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'ml-training-data' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can delete training data files
CREATE POLICY "Admins can delete training data files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ml-training-data' 
  AND has_role(auth.uid(), 'admin'::app_role)
);