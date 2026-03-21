import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("organization_id");
    if (!orgId) return NextResponse.json({ error: "organization_id fehlt" }, { status: 400 });

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

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
    const { organization_id, name, scopes, expires_at } = body;

    if (!organization_id || !name) {
      return NextResponse.json({ error: "organization_id und name sind Pflichtfelder" }, { status: 400 });
    }

    const { key, prefix, hash } = generateApiKey();

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        organization_id,
        name,
        key_hash: hash,
        key_prefix: prefix,
        scopes: scopes || [],
        expires_at: expires_at || null,
        created_by: user.id,
      })
      .select("id, name, key_prefix, scopes, expires_at, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return the full key only once at creation time
    return NextResponse.json({ data: { ...data, key } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
