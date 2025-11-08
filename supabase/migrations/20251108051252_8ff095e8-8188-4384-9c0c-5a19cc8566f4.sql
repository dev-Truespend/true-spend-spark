-- Drop the overly permissive policy on team_members table
DROP POLICY IF EXISTS "Allow all operations on team_members" ON public.team_members;

-- Create restricted policies that require authentication
CREATE POLICY "Authenticated users can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (true);