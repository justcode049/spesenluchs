-- Migration 008: Organizations + Memberships + Invitations (#16)

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Memberships (must be created before org RLS policies that reference it)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Now create organization RLS policies (memberships table exists)
CREATE POLICY "Members can read own org" ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update org" ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create orgs" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Memberships RLS policies
CREATE POLICY "Members can read org memberships" ON memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.organization_id = memberships.organization_id
        AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage memberships" ON memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.organization_id = memberships.organization_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.organization_id = memberships.organization_id
    )
  );

CREATE POLICY "Admins can update memberships" ON memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.organization_id = memberships.organization_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete memberships" ON memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.organization_id = memberships.organization_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'admin'
    )
  );

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.organization_id = invitations.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Invited users can read own invitations" ON invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Invited users can accept invitations" ON invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
