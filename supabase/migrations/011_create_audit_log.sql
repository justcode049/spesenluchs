-- Migration 011: Audit Log (#18 GoBD)

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_org ON audit_log(organization_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read audit logs for their own entities or org entities
CREATE POLICY "Users can read own audit logs" ON audit_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.user_has_org_role(organization_id, 'admin'))
  );

-- Only system (via service role) or authenticated users can insert
CREATE POLICY "Authenticated users can insert audit logs" ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Audit logs are immutable - no update or delete policies
