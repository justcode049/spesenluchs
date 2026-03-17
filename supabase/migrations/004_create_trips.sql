-- Trips table for grouping receipts and calculating per diems
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trip details
  title TEXT,
  purpose TEXT,
  destination TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',

  -- Travel times
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,

  -- Meal deductions per day stored as JSONB
  -- Format: [{"date": "2024-03-15", "breakfast": false, "lunch": false, "dinner": false}, ...]
  meal_deductions JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_start ON trips(start_datetime);

-- RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id);

-- Add trip_id to receipts for linking
ALTER TABLE public.receipts ADD COLUMN trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;
CREATE INDEX idx_receipts_trip_id ON receipts(trip_id);
