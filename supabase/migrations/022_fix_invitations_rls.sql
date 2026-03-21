-- Migration 022: Fix invitations RLS – FOR ALL ohne WITH CHECK → separate Policies
-- Die FOR ALL Policy aus Migration 021 schlug bei INSERT fehl, weil USING
-- allein keine INSERT-Berechtigung erteilt (keine "existing row" zum Prüfen).

DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- Managers/Admins können Einladungen lesen
CREATE POLICY "Managers can read invitations" ON invitations FOR SELECT
  USING (public.user_has_org_role(organization_id, 'manager'));

-- Managers/Admins können Einladungen erstellen
CREATE POLICY "Managers can create invitations" ON invitations FOR INSERT
  WITH CHECK (public.user_has_org_role(organization_id, 'manager'));

-- Managers/Admins können Einladungen aktualisieren
CREATE POLICY "Managers can update invitations" ON invitations FOR UPDATE
  USING (public.user_has_org_role(organization_id, 'manager'));

-- Managers/Admins können Einladungen löschen
CREATE POLICY "Managers can delete invitations" ON invitations FOR DELETE
  USING (public.user_has_org_role(organization_id, 'manager'));
