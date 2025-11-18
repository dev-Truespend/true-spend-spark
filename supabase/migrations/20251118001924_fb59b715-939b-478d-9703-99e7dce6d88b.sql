-- Phase 8.6: Distributed Tracing Tables and Functions

-- Create traces table for top-level request tracking
CREATE TABLE IF NOT EXISTS traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT UNIQUE NOT NULL,
  operation_name TEXT NOT NULL,
  user_id UUID,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'error', 'timeout')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spans table for individual operation tracking within traces
CREATE TABLE IF NOT EXISTS trace_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  span_id TEXT UNIQUE NOT NULL,
  parent_span_id TEXT,
  operation_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  span_type TEXT NOT NULL CHECK (span_type IN ('http', 'database', 'cache', 'function', 'external_api', 'ai_model')),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create trace errors table for detailed error tracking
CREATE TABLE IF NOT EXISTS trace_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  span_id TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_traces_trace_id ON traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_traces_user_id_started ON traces(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_status_started ON traces(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_operation_started ON traces(operation_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_duration ON traces(duration_ms DESC) WHERE duration_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON trace_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_span_id ON trace_spans(span_id);
CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON trace_spans(parent_span_id) WHERE parent_span_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spans_service_type ON trace_spans(service_name, span_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_spans_duration ON trace_spans(duration_ms DESC) WHERE duration_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trace_errors_trace_id ON trace_errors(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_errors_span_id ON trace_errors(span_id) WHERE span_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_errors_type_timestamp ON trace_errors(error_type, timestamp DESC);

-- Enable RLS
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for traces
CREATE POLICY "Users can view own traces"
  ON traces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all traces"
  ON traces FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert traces"
  ON traces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update traces"
  ON traces FOR UPDATE
  USING (true);

-- RLS Policies for trace_spans
CREATE POLICY "Users can view spans for own traces"
  ON trace_spans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM traces 
      WHERE traces.trace_id = trace_spans.trace_id 
      AND traces.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all spans"
  ON trace_spans FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert spans"
  ON trace_spans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update spans"
  ON trace_spans FOR UPDATE
  USING (true);

-- RLS Policies for trace_errors
CREATE POLICY "Users can view errors for own traces"
  ON trace_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM traces 
      WHERE traces.trace_id = trace_errors.trace_id 
      AND traces.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all errors"
  ON trace_errors FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert errors"
  ON trace_errors FOR INSERT
  WITH CHECK (true);

-- Function to cleanup old traces (30 days retention)
CREATE OR REPLACE FUNCTION cleanup_old_traces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete traces older than 30 days
  DELETE FROM traces
  WHERE started_at < NOW() - INTERVAL '30 days';
  
  -- Orphaned spans and errors will be deleted automatically due to CASCADE
  
  RAISE NOTICE 'Cleanup completed: Deleted traces older than 30 days';
END;
$$;

-- Function to calculate trace statistics
CREATE OR REPLACE FUNCTION get_trace_statistics(
  p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 hour',
  p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_traces BIGINT,
  completed_traces BIGINT,
  error_traces BIGINT,
  avg_duration_ms NUMERIC,
  p50_duration_ms NUMERIC,
  p95_duration_ms NUMERIC,
  p99_duration_ms NUMERIC,
  error_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH trace_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'error') as errors,
      AVG(duration_ms) as avg_duration,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
    FROM traces
    WHERE started_at >= p_start_time AND started_at <= p_end_time
    AND duration_ms IS NOT NULL
  )
  SELECT 
    total,
    completed,
    errors,
    ROUND(avg_duration, 2),
    ROUND(p50, 2),
    ROUND(p95, 2),
    ROUND(p99, 2),
    CASE WHEN total > 0 THEN ROUND((errors::NUMERIC / total) * 100, 2) ELSE 0 END as error_rate
  FROM trace_stats;
END;
$$;

-- Enable Realtime for traces and spans
ALTER PUBLICATION supabase_realtime ADD TABLE traces;
ALTER PUBLICATION supabase_realtime ADD TABLE trace_spans;
ALTER PUBLICATION supabase_realtime ADD TABLE trace_errors;