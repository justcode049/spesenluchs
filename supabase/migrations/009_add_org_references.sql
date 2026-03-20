-- Migration 009: Add organization_id to trips, receipts, mileage (#16)

ALTER TABLE public.trips ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.receipts ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.mileage ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

CREATE INDEX idx_trips_org ON trips(organization_id);
CREATE INDEX idx_receipts_org ON receipts(organization_id);
CREATE INDEX idx_mileage_org ON mileage(organization_id);
