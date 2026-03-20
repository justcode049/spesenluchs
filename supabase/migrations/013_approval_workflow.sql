-- Migration 013: Approval Workflow (#17)

-- Extend trip status: draft → submitted → approved / rejected
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));

-- Approval fields
ALTER TABLE public.trips
  ADD COLUMN submitted_at TIMESTAMPTZ,
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_comment TEXT;

-- Managers/Admins can update trips in their org (for approve/reject)
CREATE POLICY "Managers can update org trips" ON trips FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND public.user_has_org_role(organization_id, 'manager')
  );
