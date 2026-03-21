import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey, checkScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { parsePagination, paginatedResponse, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "receipts:read")) return apiError("Insufficient scope", 403);

    const { allowed, remaining } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const pagination = parsePagination(request.nextUrl.searchParams);
    const supabase = await createClient();

    const query = supabase
      .from("receipts")
      .select("*", { count: "exact" })
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .range(
        (pagination.page - 1) * pagination.per_page,
        pagination.page * pagination.per_page - 1
      );

    const tripId = request.nextUrl.searchParams.get("trip_id");
    if (tripId) query.eq("trip_id", tripId);

    const { data, count, error } = await query;
    if (error) return apiError(error.message, 500);

    const response = paginatedResponse(data || [], count || 0, pagination);
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", 500);
  }
}
