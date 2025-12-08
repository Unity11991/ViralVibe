-- Add missing columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_date timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_count integer default 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text default 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coin_balance integer default 100;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
