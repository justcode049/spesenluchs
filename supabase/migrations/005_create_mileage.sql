-- Mileage entries for trip-related driving
CREATE TABLE public.mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,

  -- Route
  date DATE NOT NULL,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  distance_km NUMERIC(8,1) NOT NULL,
  is_round_trip BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  -- Vehicle & rate
  vehicle_type TEXT NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car', 'motorcycle', 'ebike')),
  rate_per_km NUMERIC(4,2) NOT NULL DEFAULT 0.30,

  -- Calculated
  total_amount NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN is_round_trip THEN distance_km * 2 * rate_per_km
         ELSE distance_km * rate_per_km
    END
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mileage_user_id ON mileage(user_id);
CREATE INDEX idx_mileage_trip_id ON mileage(trip_id);

ALTER TABLE public.mileage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own mileage"
  ON mileage FOR ALL
  USING (auth.uid() = user_id);
