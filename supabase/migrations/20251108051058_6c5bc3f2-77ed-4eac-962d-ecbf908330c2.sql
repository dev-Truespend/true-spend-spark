-- Drop the overly permissive policy on tasks table
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;

-- Create restricted policies that require authentication
CREATE POLICY "Authenticated users can view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);