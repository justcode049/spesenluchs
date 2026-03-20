-- Migration 010: Multi-tenant RLS policies (#16)

-- Helper function: Does user have access to this org?
CREATE OR REPLACE FUNCTION public.user_has_org_access(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND organization_id = org_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Does user have a specific role in this org?
CREATE OR REPLACE FUNCTION public.user_has_org_role(org_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND (
        role = 'admin'
        OR role = required_role
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trips: Update RLS
DROP POLICY IF EXISTS "Users can CRUD own trips" ON trips;

CREATE POLICY "Users can read trips" ON trips FOR SELECT
  USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND public.user_has_org_access(organization_id))
  );

CREATE POLICY "Users can insert own trips" ON trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips FOR DELETE
  USING (auth.uid() = user_id);

-- Receipts: Update RLS
DROP POLICY IF EXISTS "Users can CRUD own receipts" ON receipts;

CREATE POLICY "Users can read receipts" ON receipts FOR SELECT
  USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND public.user_has_org_access(organization_id))
  );

CREATE POLICY "Users can insert own receipts" ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Mileage: Update RLS
DROP POLICY IF EXISTS "Users can CRUD own mileage" ON mileage;

CREATE POLICY "Users can read mileage" ON mileage FOR SELECT
  USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND public.user_has_org_access(organization_id))
  );

CREATE POLICY "Users can insert own mileage" ON mileage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mileage" ON mileage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mileage" ON mileage FOR DELETE
  USING (auth.uid() = user_id);
