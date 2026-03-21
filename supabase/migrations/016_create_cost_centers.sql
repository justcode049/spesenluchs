-- Phase 1: Kostenstellen + Hierarchie (#23)

-- Kostenträger
CREATE TABLE cost_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

-- Kostenstellen
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cost_object_id UUID REFERENCES cost_objects(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

-- User ↔ Kostenstelle n:m
CREATE TABLE user_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cost_center_id)
);

-- Neue Spalten auf bestehenden Tabellen
ALTER TABLE trips ADD COLUMN cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD COLUMN require_cost_center BOOLEAN NOT NULL DEFAULT false;

-- Indices
CREATE INDEX idx_cost_objects_org ON cost_objects(organization_id);
CREATE INDEX idx_cost_centers_org ON cost_centers(organization_id);
CREATE INDEX idx_cost_centers_cost_object ON cost_centers(cost_object_id);
CREATE INDEX idx_user_cost_centers_user ON user_cost_centers(user_id);
CREATE INDEX idx_user_cost_centers_cc ON user_cost_centers(cost_center_id);
CREATE INDEX idx_trips_cost_center ON trips(cost_center_id);

-- RLS
ALTER TABLE cost_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cost_centers ENABLE ROW LEVEL SECURITY;

-- cost_objects: org members can read, admins can manage
CREATE POLICY "cost_objects_select" ON cost_objects
  FOR SELECT USING (user_has_org_access(organization_id));

CREATE POLICY "cost_objects_insert" ON cost_objects
  FOR INSERT WITH CHECK (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "cost_objects_update" ON cost_objects
  FOR UPDATE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "cost_objects_delete" ON cost_objects
  FOR DELETE USING (user_has_org_role(organization_id, 'admin'));

-- cost_centers: org members can read, admins can manage
CREATE POLICY "cost_centers_select" ON cost_centers
  FOR SELECT USING (user_has_org_access(organization_id));

CREATE POLICY "cost_centers_insert" ON cost_centers
  FOR INSERT WITH CHECK (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "cost_centers_update" ON cost_centers
  FOR UPDATE USING (user_has_org_role(organization_id, 'admin'));

CREATE POLICY "cost_centers_delete" ON cost_centers
  FOR DELETE USING (user_has_org_role(organization_id, 'admin'));

-- user_cost_centers: users can read their own, admins can manage
CREATE POLICY "user_cost_centers_select" ON user_cost_centers
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cost_centers cc
      JOIN memberships m ON m.organization_id = cc.organization_id AND m.user_id = auth.uid()
      WHERE cc.id = cost_center_id
    )
  );

CREATE POLICY "user_cost_centers_insert" ON user_cost_centers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cost_centers cc
      WHERE cc.id = cost_center_id
      AND user_has_org_role(cc.organization_id, 'admin')
    )
  );

CREATE POLICY "user_cost_centers_update" ON user_cost_centers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cost_centers cc
      WHERE cc.id = cost_center_id
      AND user_has_org_role(cc.organization_id, 'admin')
    )
  );

CREATE POLICY "user_cost_centers_delete" ON user_cost_centers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cost_centers cc
      WHERE cc.id = cost_center_id
      AND user_has_org_role(cc.organization_id, 'admin')
    )
  );
