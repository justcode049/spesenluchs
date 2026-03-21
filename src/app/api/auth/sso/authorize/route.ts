import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { generateAuthUrl, generateState, generateNonce } from "@/lib/sso";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email fehlt" }, { status: 400 });
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      return NextResponse.json({ error: "Ungültige Email" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: ssoConfig } = await supabase
      .from("sso_configs")
      .select("*")
      .eq("email_domain", domain)
      .eq("enabled", true)
      .single();

    if (!ssoConfig) {
      return NextResponse.json({ error: "Kein SSO für diese Domain konfiguriert" }, { status: 404 });
    }

    const state = generateState();
    const nonce = generateNonce();

    const baseUrl = request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/sso/callback`;

    const clientSecret = decrypt(ssoConfig.client_secret_encrypted);

    // Store state and config in cookie for callback verification
    const cookieStore = await cookies();
    cookieStore.set("sso_state", JSON.stringify({
      state,
      nonce,
      ssoConfigId: ssoConfig.id,
      organizationId: ssoConfig.organization_id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = generateAuthUrl(
      ssoConfig.tenant_id,
      ssoConfig.client_id,
      redirectUri,
      state,
      nonce
    );

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("SSO authorize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO-Fehler" },
      { status: 500 }
    );
  }
}
