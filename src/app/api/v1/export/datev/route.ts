import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey, checkScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { apiError } from "@/lib/api-response";
import { calculatePerDiems } from "@/lib/per-diem";
import JSZip from "jszip";
import {
  generateEXTF,
  generateDocumentXml,
  generateBelegFilename,
  DatevExportData,
  DatevReceipt,
} from "@/lib/export-datev";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!checkScope(auth, "export:datev")) return apiError("Insufficient scope", 403);

    const { allowed } = await checkRateLimit(auth.keyId);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const { tripId } = await request.json();
    if (!tripId) return apiError("tripId is required");

    const supabase = await createClient();

    const { data: trip } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("organization_id", auth.organizationId)
      .single();

    if (!trip) return apiError("Trip not found", 404);

    const [
      { data: profile },
      { data: receipts },
      { data: mileageEntries },
      costCenterResult,
    ] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", trip.user_id).single(),
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

    const datevReceipts: DatevReceipt[] = (receipts || []).map((r) => ({
      date: r.date,
      vendor_name: r.vendor_name,
      vendor_city: r.vendor_city,
      total_amount: r.total_amount,
      currency: r.currency,
      receipt_type: r.receipt_type,
      vat_positions: r.vat_positions || [],
      image_path: r.image_path,
    }));

    const exportData: DatevExportData = {
      title: trip.title || trip.destination,
      destination: trip.destination,
      startDate: trip.start_datetime.split("T")[0],
      endDate: trip.end_datetime.split("T")[0],
      userName: profile?.display_name || "",
      costCenter: costCenterResult?.data?.number,
      allowances,
      receipts: datevReceipts,
      mileage: (mileageEntries || []).map((m) => ({
        date: m.date,
        start_location: m.start_location,
        end_location: m.end_location,
        distance_km: Number(m.distance_km),
        is_round_trip: m.is_round_trip,
        vehicle_type: m.vehicle_type,
        rate_per_km: Number(m.rate_per_km),
        total_amount: Number(m.total_amount),
      })),
    };

    const extfCsv = generateEXTF(exportData);
    const zip = new JSZip();
    zip.file("EXTF_Buchungsstapel.csv", "\uFEFF" + extfCsv);

    const belegFolder = zip.folder("Belege")!;
    const belegFiles: Array<{ filename: string; vendor: string | null }> = [];

    for (let i = 0; i < datevReceipts.length; i++) {
      const receipt = datevReceipts[i];
      if (!receipt.image_path) continue;
      const ext = receipt.image_path.split(".").pop() || "jpg";
      const filename = generateBelegFilename(i, receipt.date, receipt.vendor_name, ext);
      const { data: fileData } = await supabase.storage.from("receipts").download(receipt.image_path);
      if (fileData) {
        belegFolder.file(filename, await fileData.arrayBuffer());
        belegFiles.push({ filename, vendor: receipt.vendor_name });
      }
    }

    zip.file("document.xml", generateDocumentXml(exportData, belegFiles));
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="DATEV_Export.zip"`,
      },
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Export failed", 500);
  }
}
