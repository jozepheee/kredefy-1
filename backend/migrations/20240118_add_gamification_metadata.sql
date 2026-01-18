-- Migration: Add Metadata for Gamification
-- Adds a JSONB column to users table to store badges, streaks, and extended profile data.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create an index for faster lookups on badges (if we want to query "all users with Anchor badge")
CREATE INDEX IF NOT EXISTS idx_users_metadata ON users USING gin (metadata);

-- Add comment for documentation
COMMENT ON COLUMN users.metadata IS 'Stores flexible user data including Gamification Badges, Streaks, and UI preferences';
