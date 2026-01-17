-- Add is_archived column to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Update existing rows (optional, but good for consistency)
UPDATE cases SET is_archived = FALSE WHERE is_archived IS NULL;
