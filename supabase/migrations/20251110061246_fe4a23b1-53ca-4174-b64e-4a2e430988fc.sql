-- Fix team_members RLS policies - restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can create team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;

-- Create admin-only policies for team_members
CREATE POLICY "Admins can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix merchants RLS policies - restrict to merchants user has transacted with
DROP POLICY IF EXISTS "Authenticated users read merchants" ON public.merchants;

CREATE POLICY "Users can view merchants they've transacted with"
ON public.merchants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions
    WHERE transactions.merchant_id = merchants.id
    AND transactions.user_id = auth.uid()
  )
);

-- Allow admins to view all merchants
CREATE POLICY "Admins can view all merchants"
ON public.merchants
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));