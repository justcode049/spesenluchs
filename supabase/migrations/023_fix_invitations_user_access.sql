-- Migration 023: Fix invitations policies that access auth.users directly
-- "permission denied for table users" error because RLS policies cannot
-- directly query auth.users. Use a SECURITY DEFINER function instead.

-- Helper: Get current user's email (bypasses auth.users permission)
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix "Invited users can read own invitations"
DROP POLICY IF EXISTS "Invited users can read own invitations" ON invitations;
CREATE POLICY "Invited users can read own invitations" ON invitations FOR SELECT
  USING (email = public.current_user_email());

-- Fix "Invited users can accept invitations"
DROP POLICY IF EXISTS "Invited users can accept invitations" ON invitations;
CREATE POLICY "Invited users can accept invitations" ON invitations FOR UPDATE
  USING (email = public.current_user_email())
  WITH CHECK (email = public.current_user_email());
