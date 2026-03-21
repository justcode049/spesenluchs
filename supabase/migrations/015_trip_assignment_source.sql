-- Track whether a receipt was assigned to a trip manually or by AI
ALTER TABLE public.receipts
  ADD COLUMN trip_assignment_source TEXT
  CHECK (trip_assignment_source IN ('manual', 'auto_existing', 'auto_new_draft'));
