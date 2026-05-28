-- Add address column to housing_units
ALTER TABLE public.housing_units ADD COLUMN IF NOT EXISTS address TEXT;
