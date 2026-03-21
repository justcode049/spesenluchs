import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey, checkScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { apiError, apiSuccess } from "@/lib/api-response";
import { calculatePerDiems } from "@/lib/per-diem";
import { generateEnventaPayload, pushToEnventa, EnventaConfig } from "@/lib/export-enventa";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "export:enventa")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const { tripId } = await request.json();
    if (!tripId) return apiError("tripId is required");

    const supabase = await createClient();

    // Load ERP config for enventa
    const { data: erpConfig } = await supabase
      .from("erp_configs")
      .select("config")
      .eq("organization_id", auth.organizationId)
      .eq("erp_type", "enventa")
      .eq("enabled", true)
      .single();

    if (!erpConfig) return apiError("enventa integration not configured", 400);

    const enventaConfig = erpConfig.config as EnventaConfig;
    if (!enventaConfig.base_url || !enventaConfig.api_key) {
      return apiError("enventa configuration incomplete", 400);
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("organization_id", auth.organizationId)
      .single();

    if (!trip) return apiError("Trip not found", 404);

    const [
      { data: receipts },
      { data: mileageEntries },
      costCenterResult,
    ] = await Promise.all([
      supabase.from("receipts").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("mileage").select("*").eq("trip_id", tripId).order("date"),
      trip.cost_center_id
        ? supabase.from("cost_centers").select("number").eq("id", trip.cost_center_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const allowances = calculatePerDiems(
      trip.start_datetime,
      trip.end_datetime,
      trip.country,
      trip.meal_deductions || []
    );

    const buchungen = generateEnventaPayload({
      title: trip.title || trip.destination,
      destination: trip.destination,
      startDate: trip.start_datetime.split("T")[0],
      endDate: trip.end_datetime.split("T")[0],
      userName: "",
      costCenter: costCenterResult?.data?.number,
      allowances,
      receipts: (receipts || []).map((r) => ({
        date: r.date,
        vendor_name: r.vendor_name,
        total_amount: r.total_amount,
        currency: r.currency,
        receipt_type: r.receipt_type,
      })),
      mileage: (mileageEntries || []).map((m) => ({
        date: m.date,
        start_location: m.start_location,
        end_location: m.end_location,
        total_amount: Number(m.total_amount),
      })),
    });

    const result = await pushToEnventa(enventaConfig, buchungen);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Export failed", 500);
  }
}
