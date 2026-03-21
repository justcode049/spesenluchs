import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey, checkScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "organization:read")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", auth.organizationId)
      .single();

    if (error || !data) return apiError("Organization not found", 404);
    return apiSuccess(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", 500);
  }
}
