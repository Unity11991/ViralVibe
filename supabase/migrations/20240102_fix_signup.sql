-- Fix Signup Error Migration
-- 1. Drop existing trigger and functions to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS generate_referral_code();

-- 2. Re-create generate_referral_code with explicit casting
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result text := '';
    i integer;
    rand_idx integer;
BEGIN
    FOR i IN 1..6 LOOP
        -- Explicitly cast floor result to integer
        rand_idx := floor(random() * length(chars) + 1)::integer;
        result := result || substr(chars, rand_idx, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create handle_new_user with robust error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_referral_code text;
    referrer_id uuid;
    ref_code_input text;
    user_full_name text;
    user_avatar_url text;
BEGIN
    -- Generate a unique referral code
    LOOP
        new_referral_code := generate_referral_code();
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code) THEN
            EXIT;
        END IF;
    END LOOP;

    -- Get metadata with defaults
    user_full_name := new.raw_user_meta_data->>'full_name';
    IF user_full_name IS NULL OR user_full_name = '' THEN
        user_full_name := 'User ' || substr(new.id::text, 1, 4);
    END IF;

    user_avatar_url := new.raw_user_meta_data->>'avatar_url';
    
    -- Check for referral code
    ref_code_input := new.raw_user_meta_data->>'referral_code';
    
    IF ref_code_input IS NOT NULL AND ref_code_input != '' THEN
        SELECT id INTO referrer_id FROM profiles WHERE referral_code = ref_code_input;
    END IF;

    -- Insert Profile with error handling
    BEGIN
        INSERT INTO public.profiles (id, full_name, avatar_url, coin_balance, referral_code, referred_by)
        VALUES (
            new.id, 
            user_full_name, 
            user_avatar_url, 
            CASE WHEN referrer_id IS NOT NULL THEN 1500 ELSE 1000 END,
            new_referral_code,
            referrer_id
        );
    EXCEPTION WHEN OTHERS THEN
        -- Fallback insert if something fails (e.g. unique constraint race condition)
        -- Log error if possible, or just insert basic profile
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        INSERT INTO public.profiles (id, full_name, coin_balance, referral_code)
        VALUES (new.id, 'User ' || substr(new.id::text, 1, 4), 1000, new_referral_code);
    END;

    -- Reward Referrer (if exists)
    IF referrer_id IS NOT NULL THEN
        UPDATE profiles 
        SET coin_balance = coin_balance + 500 
        WHERE id = referrer_id;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
