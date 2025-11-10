-- Restrict phases table to admins only
DROP POLICY IF EXISTS "Authenticated users can create phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can delete phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can update phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can view phases" ON public.phases;

CREATE POLICY "Admins can view phases" ON public.phases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create phases" ON public.phases FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update phases" ON public.phases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete phases" ON public.phases FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict tasks table to admins only
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;

CREATE POLICY "Admins can view tasks" ON public.tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict architecture_components table to admins only
DROP POLICY IF EXISTS "Authenticated users can create architecture components" ON public.architecture_components;
DROP POLICY IF EXISTS "Authenticated users can delete architecture components" ON public.architecture_components;
DROP POLICY IF EXISTS "Authenticated users can update architecture components" ON public.architecture_components;
DROP POLICY IF EXISTS "Authenticated users can view architecture components" ON public.architecture_components;

CREATE POLICY "Admins can view architecture components" ON public.architecture_components FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create architecture components" ON public.architecture_components FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update architecture components" ON public.architecture_components FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete architecture components" ON public.architecture_components FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict risks table to admins only
DROP POLICY IF EXISTS "Authenticated users can create risks" ON public.risks;
DROP POLICY IF EXISTS "Authenticated users can delete risks" ON public.risks;
DROP POLICY IF EXISTS "Authenticated users can update risks" ON public.risks;
DROP POLICY IF EXISTS "Authenticated users can view risks" ON public.risks;

CREATE POLICY "Admins can view risks" ON public.risks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create risks" ON public.risks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update risks" ON public.risks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete risks" ON public.risks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict milestones table to admins only
DROP POLICY IF EXISTS "Authenticated users can create milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated users can delete milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated users can update milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated users can view milestones" ON public.milestones;

CREATE POLICY "Admins can view milestones" ON public.milestones FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create milestones" ON public.milestones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update milestones" ON public.milestones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete milestones" ON public.milestones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict project_metadata table to admins only
DROP POLICY IF EXISTS "Authenticated users can create project metadata" ON public.project_metadata;
DROP POLICY IF EXISTS "Authenticated users can delete project metadata" ON public.project_metadata;
DROP POLICY IF EXISTS "Authenticated users can update project metadata" ON public.project_metadata;
DROP POLICY IF EXISTS "Authenticated users can view project metadata" ON public.project_metadata;

CREATE POLICY "Admins can view project metadata" ON public.project_metadata FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create project metadata" ON public.project_metadata FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update project metadata" ON public.project_metadata FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete project metadata" ON public.project_metadata FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict platform_features table to admins only
DROP POLICY IF EXISTS "Authenticated users can manage platform features" ON public.platform_features;
DROP POLICY IF EXISTS "Authenticated users can view platform features" ON public.platform_features;

CREATE POLICY "Admins can view platform features" ON public.platform_features FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create platform features" ON public.platform_features FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update platform features" ON public.platform_features FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete platform features" ON public.platform_features FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict readiness_gates table to admins only
DROP POLICY IF EXISTS "Allow all operations on readiness_gates" ON public.readiness_gates;

CREATE POLICY "Admins can view readiness gates" ON public.readiness_gates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create readiness gates" ON public.readiness_gates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update readiness gates" ON public.readiness_gates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete readiness gates" ON public.readiness_gates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict metrics table to admins only
DROP POLICY IF EXISTS "Allow all operations on metrics" ON public.metrics;

CREATE POLICY "Admins can view metrics" ON public.metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create metrics" ON public.metrics FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update metrics" ON public.metrics FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete metrics" ON public.metrics FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict test_results table to admins only
DROP POLICY IF EXISTS "Allow all operations on test_results" ON public.test_results;

CREATE POLICY "Admins can view test results" ON public.test_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create test results" ON public.test_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update test results" ON public.test_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete test results" ON public.test_results FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Restrict phase_tests table to admins only
DROP POLICY IF EXISTS "Authenticated users can insert phase tests" ON public.phase_tests;
DROP POLICY IF EXISTS "Authenticated users can view phase tests" ON public.phase_tests;

CREATE POLICY "Admins can view phase tests" ON public.phase_tests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create phase tests" ON public.phase_tests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update phase tests" ON public.phase_tests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete phase tests" ON public.phase_tests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));