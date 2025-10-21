-- Migration: Fix lesson_contents duplication
-- Description: Add unique constraint and fix duplication issues
-- Run this after 001_initial_schema.sql and 002_multi_agent_traces.sql

-- Add unique constraint to prevent multiple lesson_contents for same lesson
-- First, remove any existing duplicates (keep the latest one)
DELETE FROM lesson_contents 
WHERE id NOT IN (
  SELECT DISTINCT ON (lesson_id) id 
  FROM lesson_contents 
  ORDER BY lesson_id, created_at DESC
);

-- Add unique constraint
ALTER TABLE lesson_contents 
ADD CONSTRAINT unique_lesson_content UNIQUE (lesson_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_lesson_content ON lesson_contents IS 'Ensures only one content entry per lesson';

