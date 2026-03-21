import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import crypto from "crypto";

export interface ApiAuthResult {
  organizationId: string;
  keyId: string;
  scopes: string[];
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const key = `sl_live_${randomBytes}`;
  const prefix = key.substring(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export async function authenticateApiKey(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer sl_live_")) {
    throw new Error("Missing or invalid API key");
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = hashApiKey(apiKey);

  const supabase = await createClient();
  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, scopes, expires_at, revoked_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) {
    throw new Error("Invalid API key");
  }

  if (keyRecord.revoked_at) {
    throw new Error("API key has been revoked");
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    throw new Error("API key has expired");
  }

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return {
    organizationId: keyRecord.organization_id,
    keyId: keyRecord.id,
    scopes: keyRecord.scopes || [],
  };
}

export function checkScope(auth: ApiAuthResult, requiredScope: string): boolean {
  if (auth.scopes.length === 0) return true; // empty scopes = full access
  return auth.scopes.includes(requiredScope) || auth.scopes.includes("*");
}
