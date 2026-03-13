-- Add location columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lat FLOAT8;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lng FLOAT8;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS kmz_path TEXT;

-- Add location columns to housing_units
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS lat FLOAT8;
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS lng FLOAT8;

-- Create storage bucket if it doesn't exist (NOTE: this might need to be done via UI if SQL permissions restrict it, 
-- but we try anyway for ease of use)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mapas', 'mapas', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the 'mapas' bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to mapas" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mapas');

-- Allow authenticated users to view
CREATE POLICY "Allow authenticated views of mapas" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mapas');
