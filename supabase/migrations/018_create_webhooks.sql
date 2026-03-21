-- Phase 3: Webhook-System

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at)
  WHERE next_retry_at IS NOT NULL;

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_select" ON webhooks
  FOR SELECT USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "webhooks_insert" ON webhooks
  FOR INSERT WITH CHECK (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "webhooks_update" ON webhooks
  FOR UPDATE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "webhooks_delete" ON webhooks
  FOR DELETE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "webhook_deliveries_select" ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      WHERE w.id = webhook_id
      AND user_has_org_role(w.organization_id, 'admin')
    )
  );
