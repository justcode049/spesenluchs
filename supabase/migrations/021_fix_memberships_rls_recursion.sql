-- Migration 021: Fix infinite recursion in memberships RLS policies
-- The memberships INSERT/SELECT/UPDATE/DELETE policies all query memberships
-- itself, causing infinite recursion. Use SECURITY DEFINER functions instead.

-- Helper: Is user admin in org? (bypasses RLS on memberships)
CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Is user member of org? (bypasses RLS on memberships)
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND organization_id = org_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Is org empty (no members yet)? For first-member creation.
CREATE OR REPLACE FUNCTION public.org_has_no_members(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = org_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Replace memberships policies
DROP POLICY IF EXISTS "Members can read org memberships" ON memberships;
CREATE POLICY "Members can read org memberships" ON memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "Admins can manage memberships" ON memberships;
CREATE POLICY "Admins can manage memberships" ON memberships FOR INSERT
  WITH CHECK (
    public.user_is_org_admin(organization_id)
    OR public.org_has_no_members(organization_id)
  );

DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
CREATE POLICY "Admins can update memberships" ON memberships FOR UPDATE
  USING (public.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
CREATE POLICY "Admins can delete memberships" ON memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.user_is_org_admin(organization_id)
  );

-- Also fix invitations policies that query memberships directly
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;
CREATE POLICY "Admins can manage invitations" ON invitations FOR ALL
  USING (
    public.user_has_org_role(organization_id, 'manager')
  );
