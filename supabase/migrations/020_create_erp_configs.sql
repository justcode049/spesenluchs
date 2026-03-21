-- Phase 5: ERP-Integration

CREATE TABLE erp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  erp_type TEXT NOT NULL CHECK (erp_type IN ('datev', 'sap', 'enventa')),
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, erp_type)
);

CREATE INDEX idx_erp_configs_org ON erp_configs(organization_id);

ALTER TABLE erp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_configs_select" ON erp_configs
  FOR SELECT USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "erp_configs_insert" ON erp_configs
  FOR INSERT WITH CHECK (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "erp_configs_update" ON erp_configs
  FOR UPDATE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "erp_configs_delete" ON erp_configs
  FOR DELETE USING (user_has_org_role(organization_id, 'admin'));
