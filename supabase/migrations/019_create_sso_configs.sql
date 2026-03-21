-- Phase 4: Enterprise SSO

CREATE TABLE sso_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'azure_ad',
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  auto_provision BOOLEAN NOT NULL DEFAULT true,
  role_mapping JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email_domain)
);

CREATE INDEX idx_sso_configs_org ON sso_configs(organization_id);
CREATE INDEX idx_sso_configs_domain ON sso_configs(email_domain);

ALTER TABLE sso_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sso_configs_select" ON sso_configs
  FOR SELECT USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "sso_configs_insert" ON sso_configs
  FOR INSERT WITH CHECK (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "sso_configs_update" ON sso_configs
  FOR UPDATE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "sso_configs_delete" ON sso_configs
  FOR DELETE USING (user_has_org_role(organization_id, 'admin'));
