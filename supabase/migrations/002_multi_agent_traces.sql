-- Migration: Multi-Agent Traces Table
-- Description: Stores detailed traces of multi-agent generation process
-- Run this after 001_initial_schema.sql

-- Create multi_agent_traces table
CREATE TABLE IF NOT EXISTS multi_agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  trace_data JSONB NOT NULL, -- Full agent communication trace
  total_agents INTEGER NOT NULL, -- Number of unique agents involved
  total_duration_ms INTEGER NOT NULL, -- Total generation time
  complexity_score INTEGER DEFAULT 0, -- Complexity score that triggered routing
  success BOOLEAN DEFAULT true, -- Whether generation succeeded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_multi_agent_traces_lesson_id ON multi_agent_traces(lesson_id);
CREATE INDEX idx_multi_agent_traces_success ON multi_agent_traces(success);
CREATE INDEX idx_multi_agent_traces_complexity ON multi_agent_traces(complexity_score);
CREATE INDEX idx_multi_agent_traces_created_at ON multi_agent_traces(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE multi_agent_traces IS 'Stores detailed traces of multi-agent lesson generation process';
COMMENT ON COLUMN multi_agent_traces.trace_data IS 'JSONB array containing step-by-step agent communications with reasoning';
COMMENT ON COLUMN multi_agent_traces.complexity_score IS 'Complexity score (0-100) that determined routing to multi-agent';
COMMENT ON COLUMN multi_agent_traces.success IS 'Whether the multi-agent generation succeeded (false if fell back to single-agent)';

-- Optional: Add view for easy trace analysis
CREATE OR REPLACE VIEW multi_agent_trace_summary AS
SELECT 
  mat.id,
  mat.lesson_id,
  l.title as lesson_title,
  l.status as lesson_status,
  mat.total_agents,
  mat.total_duration_ms,
  mat.complexity_score,
  mat.success,
  jsonb_array_length(mat.trace_data) as total_steps,
  mat.created_at
FROM multi_agent_traces mat
JOIN lessons l ON mat.lesson_id = l.id
ORDER BY mat.created_at DESC;

COMMENT ON VIEW multi_agent_trace_summary IS 'Summary view of multi-agent traces with lesson information';

