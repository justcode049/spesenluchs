-- Add hospitality/entertainment fields to receipts (Bewirtungsbeleg)
ALTER TABLE public.receipts
  ADD COLUMN hospitality_occasion TEXT,
  ADD COLUMN hospitality_attendees TEXT,
  ADD COLUMN hospitality_tip NUMERIC(10,2);
