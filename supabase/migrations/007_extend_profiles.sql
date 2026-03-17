-- Extend profiles with additional fields for v1.1
ALTER TABLE public.profiles
  ADD COLUMN city TEXT,
  ADD COLUMN employer TEXT,
  ADD COLUMN primary_workplace TEXT,
  ADD COLUMN vehicle_type TEXT DEFAULT 'car' CHECK (vehicle_type IN ('car', 'motorcycle', 'ebike')),
  ADD COLUMN employment_type TEXT DEFAULT 'employee' CHECK (employment_type IN ('employee', 'freelancer')),
  ADD COLUMN tax_id TEXT,
  ADD COLUMN license_plate TEXT,
  ADD COLUMN default_cost_center TEXT;
