import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.tenant_id !== undefined) updates.tenant_id = body.tenant_id;
    if (body.client_id !== undefined) updates.client_id = body.client_id;
    if (body.client_secret !== undefined) updates.client_secret_encrypted = encrypt(body.client_secret);
    if (body.email_domain !== undefined) updates.email_domain = body.email_domain.toLowerCase();
    if (body.auto_provision !== undefined) updates.auto_provision = body.auto_provision;
    if (body.role_mapping !== undefined) updates.role_mapping = body.role_mapping;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    const { data, error } = await supabase
      .from("sso_configs")
      .update(updates)
      .eq("id", id)
      .select("id, organization_id, provider, tenant_id, client_id, email_domain, auto_provision, role_mapping, enabled, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { error } = await supabase.from("sso_configs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
