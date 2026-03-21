import crypto from "crypto";

export interface OidcTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface OidcIdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  roles?: string[];
}

export function generateAuthUrl(
  tenantId: string,
  clientId: string,
  redirectUri: string,
  state: string,
  nonce: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "openid email profile",
    state,
    nonce,
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<OidcTokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: "openid email profile",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export function parseIdToken(idToken: string): OidcIdTokenClaims {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid ID token format");

  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8")
  );

  // Basic validation
  if (!payload.sub || !payload.email) {
    throw new Error("ID token missing required claims (sub, email)");
  }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("ID token has expired");
  }

  return payload as OidcIdTokenClaims;
}

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}
