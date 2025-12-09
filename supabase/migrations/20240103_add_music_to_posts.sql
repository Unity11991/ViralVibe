-- Add music column to scheduled_posts table
ALTER TABLE public.scheduled_posts 
ADD COLUMN IF NOT EXISTS music text;
