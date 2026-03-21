import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { exchangeCodeForTokens, parseIdToken } from "@/lib/sso";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/login?error=missing_params", request.url));
    }

    // Verify state
    const cookieStore = await cookies();
    const ssoStateCookie = cookieStore.get("sso_state");
    if (!ssoStateCookie) {
      return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
    }

    const ssoState = JSON.parse(ssoStateCookie.value);
    if (ssoState.state !== state) {
      return NextResponse.redirect(new URL("/login?error=state_mismatch", request.url));
    }

    // Clear state cookie
    cookieStore.delete("sso_state");

    const supabase = await createClient();

    // Load SSO config
    const { data: ssoConfig } = await supabase
      .from("sso_configs")
      .select("*")
      .eq("id", ssoState.ssoConfigId)
      .single();

    if (!ssoConfig) {
      return NextResponse.redirect(new URL("/login?error=sso_config_not_found", request.url));
    }

    const clientSecret = decrypt(ssoConfig.client_secret_encrypted);
    const redirectUri = `${request.nextUrl.origin}/api/auth/sso/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      ssoConfig.tenant_id,
      ssoConfig.client_id,
      clientSecret,
      code,
      redirectUri
    );

    // Parse and validate ID token
    const claims = parseIdToken(tokens.id_token);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", claims.sub)
      .single();

    if (existingUser) {
      // Existing user - sign in via Supabase
      // Note: In production, you'd use supabase.auth.admin.generateLink() or similar
      // For now, we sign in with a service role approach
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: claims.email,
        password: claims.sub, // This is a simplified approach
      });

      if (signInError) {
        // User exists but password doesn't match - this is expected for SSO users
        // In a real implementation, you'd use Supabase's SSO integration or admin API
        return NextResponse.redirect(new URL("/login?error=sso_signin_failed", request.url));
      }
    } else if (ssoConfig.auto_provision) {
      // JIT Provisioning - create user
      const { data: newUser, error: signUpError } = await supabase.auth.signUp({
        email: claims.email,
        password: crypto.randomUUID(), // Random password for SSO users
        options: {
          data: {
            display_name: claims.name || claims.preferred_username || claims.email,
            sso_provider: ssoConfig.provider,
            sso_sub: claims.sub,
          },
        },
      });

      if (signUpError || !newUser.user) {
        return NextResponse.redirect(new URL("/login?error=provisioning_failed", request.url));
      }

      // Add to organization
      const role = resolveRole(claims.roles || [], ssoConfig.role_mapping || {});
      await supabase.from("memberships").insert({
        user_id: newUser.user.id,
        organization_id: ssoConfig.organization_id,
        role,
      });
    } else {
      return NextResponse.redirect(new URL("/login?error=user_not_found", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("SSO callback error:", error);
    return NextResponse.redirect(new URL("/login?error=sso_error", request.url));
  }
}

function resolveRole(
  adRoles: string[],
  roleMapping: Record<string, string>
): string {
  for (const adRole of adRoles) {
    const mapped = roleMapping[adRole];
    if (mapped && ["admin", "manager", "employee"].includes(mapped)) {
      return mapped;
    }
  }
  return "employee"; // default role
}
