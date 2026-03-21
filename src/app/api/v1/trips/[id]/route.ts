import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey, checkScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "trips:read")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (error || !data) return apiError("Trip not found", 404);
    return apiSuccess(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "trips:write")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const body = await request.json();
    const supabase = await createClient();

    // Only allow updating draft trips
    const { data: existing } = await supabase
      .from("trips")
      .select("status")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (!existing) return apiError("Trip not found", 404);
    if (existing.status !== "draft") return apiError("Only draft trips can be updated", 400);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowed_fields = ["title", "destination", "country", "purpose", "start_datetime", "end_datetime", "cost_center_id"];
    for (const field of allowed_fields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const { data, error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select()
      .single();

    if (error) return apiError(error.message, 500);
    return apiSuccess(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "trips:write")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const supabase = await createClient();

    // Only allow deleting draft trips
    const { data: existing } = await supabase
      .from("trips")
      .select("status")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (!existing) return apiError("Trip not found", 404);
    if (existing.status !== "draft") return apiError("Only draft trips can be deleted", 400);

    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", id)
      .eq("organization_id", auth.organizationId);

    if (error) return apiError(error.message, 500);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Server error", 500);
  }
}
