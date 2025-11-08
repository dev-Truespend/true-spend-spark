-- Drop overly permissive policies on project tables
DROP POLICY IF EXISTS "Allow all operations on project_metadata" ON public.project_metadata;
DROP POLICY IF EXISTS "Allow all operations on phases" ON public.phases;
DROP POLICY IF EXISTS "Allow all operations on milestones" ON public.milestones;
DROP POLICY IF EXISTS "Allow all operations on risks" ON public.risks;
DROP POLICY IF EXISTS "Allow all operations on architecture_components" ON public.architecture_components;

-- Create restricted policies for project_metadata
CREATE POLICY "Authenticated users can view project metadata"
ON public.project_metadata FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create project metadata"
ON public.project_metadata FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update project metadata"
ON public.project_metadata FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project metadata"
ON public.project_metadata FOR DELETE TO authenticated USING (true);

-- Create restricted policies for phases
CREATE POLICY "Authenticated users can view phases"
ON public.phases FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create phases"
ON public.phases FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update phases"
ON public.phases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete phases"
ON public.phases FOR DELETE TO authenticated USING (true);

-- Create restricted policies for milestones
CREATE POLICY "Authenticated users can view milestones"
ON public.milestones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create milestones"
ON public.milestones FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update milestones"
ON public.milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete milestones"
ON public.milestones FOR DELETE TO authenticated USING (true);

-- Create restricted policies for risks
CREATE POLICY "Authenticated users can view risks"
ON public.risks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create risks"
ON public.risks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update risks"
ON public.risks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete risks"
ON public.risks FOR DELETE TO authenticated USING (true);

-- Create restricted policies for architecture_components
CREATE POLICY "Authenticated users can view architecture components"
ON public.architecture_components FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create architecture components"
ON public.architecture_components FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update architecture components"
ON public.architecture_components FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete architecture components"
ON public.architecture_components FOR DELETE TO authenticated USING (true);