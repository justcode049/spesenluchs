import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey, checkScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { parsePagination, paginatedResponse, apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "trips:read")) return apiError("Insufficient scope", 403);

    const { allowed, remaining } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const pagination = parsePagination(request.nextUrl.searchParams);
    const supabase = await createClient();

    const query = supabase
      .from("trips")
      .select("*", { count: "exact" })
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .range(
        (pagination.page - 1) * pagination.per_page,
        pagination.page * pagination.per_page - 1
      );

    // Optional filters
    const status = request.nextUrl.searchParams.get("status");
    if (status) query.eq("status", status);

    const costCenterId = request.nextUrl.searchParams.get("cost_center_id");
    if (costCenterId) query.eq("cost_center_id", costCenterId);

    const { data, count, error } = await query;
    if (error) return apiError(error.message, 500);

    const response = paginatedResponse(data || [], count || 0, pagination);
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", error instanceof Error && error.message.includes("API key") ? 401 : 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "trips:write")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const body = await request.json();
    const { title, destination, country, purpose, start_datetime, end_datetime, cost_center_id, user_id } = body;

    if (!destination || !start_datetime || !end_datetime || !user_id) {
      return apiError("destination, start_datetime, end_datetime, and user_id are required");
    }

    const supabase = await createClient();

    // Verify user is member of the organization
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .eq("user_id", user_id)
      .single();

    if (!membership) return apiError("User is not a member of this organization", 403);

    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id,
        title: title || null,
        destination,
        country: country || "DE",
        purpose: purpose || null,
        start_datetime,
        end_datetime,
        meal_deductions: [],
        status: "draft",
        organization_id: auth.organizationId,
        cost_center_id: cost_center_id || null,
      })
      .select()
      .single();

    if (error) return apiError(error.message, 500);
    return apiSuccess(data, 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", 500);
  }
}
