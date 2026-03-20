-- Migration 014: Fix circular RLS dependency between organizations and memberships
-- The organizations SELECT policy queried memberships directly (subject to RLS),
-- causing 500 errors on JOINs. Use SECURITY DEFINER function instead.

DROP POLICY IF EXISTS "Members can read own org" ON organizations;
CREATE POLICY "Members can read own org" ON organizations FOR SELECT
  USING (public.user_has_org_access(id));

DROP POLICY IF EXISTS "Admins can update org" ON organizations;
CREATE POLICY "Admins can update org" ON organizations FOR UPDATE
  USING (public.user_has_org_role(id, 'admin'));
