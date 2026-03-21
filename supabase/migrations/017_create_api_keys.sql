-- Phase 2: REST API + API Keys

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_rate_limits (
  key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key_id, window_start)
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- API keys: org admins can manage
CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "api_keys_update" ON api_keys
  FOR UPDATE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "api_keys_delete" ON api_keys
  FOR DELETE USING (user_has_org_role(organization_id, 'admin'));

-- Rate limits: accessible via service role only (API routes use service-level access)
CREATE POLICY "rate_limits_all" ON api_rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM api_keys ak
      WHERE ak.id = key_id
      AND user_has_org_role(ak.organization_id, 'admin')
    )
  );
