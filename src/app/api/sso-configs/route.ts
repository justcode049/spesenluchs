import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("organization_id");
    if (!orgId) return NextResponse.json({ error: "organization_id fehlt" }, { status: 400 });

    const { data, error } = await supabase
      .from("sso_configs")
      .select("id, organization_id, provider, tenant_id, client_id, email_domain, auto_provision, role_mapping, enabled, created_at, updated_at")
      .eq("organization_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json();
    const { organization_id, tenant_id, client_id, client_secret, email_domain, auto_provision, role_mapping } = body;

    if (!organization_id || !tenant_id || !client_id || !client_secret || !email_domain) {
      return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
    }

    const clientSecretEncrypted = encrypt(client_secret);

    const { data, error } = await supabase
      .from("sso_configs")
      .insert({
        organization_id,
        provider: "azure_ad",
        tenant_id,
        client_id,
        client_secret_encrypted: clientSecretEncrypted,
        email_domain: email_domain.toLowerCase(),
        auto_provision: auto_provision ?? true,
        role_mapping: role_mapping || {},
      })
      .select("id, organization_id, provider, tenant_id, client_id, email_domain, auto_provision, role_mapping, enabled, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Diese Domain ist bereits konfiguriert" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
