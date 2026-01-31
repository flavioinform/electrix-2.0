-- Add active column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update existing rows to be active
UPDATE profiles SET active = true WHERE active IS NULL;
