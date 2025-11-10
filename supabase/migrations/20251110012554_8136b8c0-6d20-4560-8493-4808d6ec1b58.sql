-- Assign admin role to otherservices51@gmail.com
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
  '7f03c5a3-68b2-42ea-a3b5-c53343bf2dfb'::uuid,
  'admin'::app_role,
  '7f03c5a3-68b2-42ea-a3b5-c53343bf2dfb'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;