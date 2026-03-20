-- Migration 012: GoBD Immutability (#18)

-- Receipts: Lock fields
ALTER TABLE public.receipts ADD COLUMN locked_at TIMESTAMPTZ;
ALTER TABLE public.receipts ADD COLUMN content_hash TEXT;

-- Trips: Lock fields
ALTER TABLE public.trips ADD COLUMN locked_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN content_hash TEXT;

-- Trigger: Prevent modification after lock
CREATE OR REPLACE FUNCTION public.prevent_locked_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND NEW.locked_at = OLD.locked_at THEN
    RAISE EXCEPTION 'Record is locked (GoBD) and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipts_lock_guard BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_update();

CREATE TRIGGER trips_lock_guard BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_update();
