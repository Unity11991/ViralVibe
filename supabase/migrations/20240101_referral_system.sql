-- 1. Add Referral Columns to Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

-- 2. Function to Generate Random Referral Code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Update handle_new_user to handle referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_referral_code text;
    referrer_id uuid;
    ref_code_input text;
BEGIN
    -- Generate a unique referral code
    LOOP
        new_referral_code := generate_referral_code();
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code) THEN
            EXIT;
        END IF;
    END LOOP;

    -- Check if user signed up with a referral code (passed in metadata)
    ref_code_input := new.raw_user_meta_data->>'referral_code';
    
    IF ref_code_input IS NOT NULL THEN
        SELECT id INTO referrer_id FROM profiles WHERE referral_code = ref_code_input;
    END IF;

    -- Insert Profile
    INSERT INTO public.profiles (id, full_name, avatar_url, coin_balance, referral_code, referred_by)
    VALUES (
        new.id, 
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'avatar_url', 
        CASE WHEN referrer_id IS NOT NULL THEN 1500 ELSE 1000 END, -- Bonus for new user
        new_referral_code,
        referrer_id
    );

    -- Reward Referrer (if exists)
    IF referrer_id IS NOT NULL THEN
        UPDATE profiles 
        SET coin_balance = coin_balance + 500 
        WHERE id = referrer_id;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
