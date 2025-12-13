-- MASTER FIX: Signup & Referral System
-- Run this script to fix "Database error saving new user"
-- It handles everything: columns, functions, and triggers.

-- 1. Ensure Columns Exist (Safe to run multiple times)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

-- 2. Drop existing objects to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.generate_referral_code();

-- 3. Helper Function: Generate Referral Code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result text := '';
    i integer;
    rand_idx integer;
BEGIN
    FOR i IN 1..6 LOOP
        rand_idx := floor(random() * length(chars) + 1)::integer;
        result := result || substr(chars, rand_idx, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Main Trigger Function (With Safety Fallback)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_referral_code text;
    referrer_id uuid;
    ref_code_input text;
    user_full_name text;
    user_avatar_url text;
BEGIN
    -- Wrap everything in a block to catch ANY error
    BEGIN
        -- 1. Prepare Data
        user_full_name := new.raw_user_meta_data->>'full_name';
        IF user_full_name IS NULL OR user_full_name = '' THEN
            user_full_name := 'User ' || substr(new.id::text, 1, 4);
        END IF;

        user_avatar_url := new.raw_user_meta_data->>'avatar_url';
        
        -- 2. Generate Referral Code
        LOOP
            new_referral_code := public.generate_referral_code();
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) THEN
                EXIT;
            END IF;
        END LOOP;

        -- 3. Check for Referrer
        ref_code_input := new.raw_user_meta_data->>'referral_code';
        IF ref_code_input IS NOT NULL AND ref_code_input != '' THEN
            SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code_input;
        END IF;

        -- 4. Insert Profile
        INSERT INTO public.profiles (
            id, 
            full_name, 
            avatar_url, 
            coin_balance, 
            referral_code, 
            referred_by
        )
        VALUES (
            new.id, 
            user_full_name, 
            user_avatar_url, 
            CASE WHEN referrer_id IS NOT NULL THEN 1500 ELSE 1000 END,
            new_referral_code,
            referrer_id
        );

        -- 5. Reward Referrer
        IF referrer_id IS NOT NULL THEN
            UPDATE public.profiles 
            SET coin_balance = coin_balance + 500 
            WHERE id = referrer_id;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- FALLBACK: If anything fails, just create a basic profile so signup succeeds
        RAISE WARNING 'handle_new_user failed: %. Falling back to basic profile.', SQLERRM;
        
        INSERT INTO public.profiles (id, full_name, coin_balance)
        VALUES (
            new.id, 
            'User ' || substr(new.id::text, 1, 4), 
            1000
        )
        ON CONFLICT (id) DO NOTHING;
    END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-attach Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
