-- Receipts table
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Image reference
  image_path TEXT NOT NULL,

  -- Extracted / edited fields
  date DATE,
  total_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  vendor_name TEXT,
  vendor_city TEXT,
  receipt_type TEXT CHECK (receipt_type IN (
    'hotel', 'restaurant', 'taxi', 'public_transport',
    'gas_station', 'parking', 'train', 'flight', 'other'
  )),

  -- VAT stored as JSONB array
  vat_positions JSONB DEFAULT '[]'::jsonb,

  -- AI metadata
  confidence JSONB DEFAULT '{}'::jsonb,
  raw_extraction JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(date);

-- RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own receipts"
  ON receipts FOR ALL
  USING (auth.uid() = user_id);
