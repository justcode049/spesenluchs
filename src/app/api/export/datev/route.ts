import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { tripId } = await request.json();
    if (!tripId) {
      return NextResponse.json({ error: "tripId fehlt" }, { status: 400 });
    }

    // Load trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: "Reise nicht gefunden" }, { status: 404 });
    }

    // Verify access: owner or org member
    if (trip.user_id !== user.id) {
      if (!trip.organization_id) {
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("organization_id", trip.organization_id)
        .eq("user_id", user.id)
        .single();
      if (!membership || !["manager", "admin"].includes(membership.role)) {
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }
    }

    // Load profile, receipts, mileage in parallel
    const [
      { data: profile },
      { data: receipts },
      { data: mileageEntries },
    ] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", trip.user_id).single(),
      supabase.from("receipts").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("mileage").select("*").eq("trip_id", tripId).order("date"),
    ]);

    // Calculate per diems
    const allowances = calculatePerDiems(
      trip.start_datetime,
      trip.end_datetime,
      trip.country,
      trip.meal_deductions || []
    );

    // Map receipts for DATEV
    const datevReceipts: DatevReceipt[] = (receipts || []).map((r) => ({
      date: r.date,
      vendor_name: r.vendor_name,
      vendor_city: r.vendor_city,
      total_amount: r.total_amount,
      currency: r.currency,
      receipt_type: r.receipt_type,
      vat_positions: r.vat_positions || [],
      image_path: r.image_path,
      hospitality_occasion: r.hospitality_occasion,
      hospitality_attendees: r.hospitality_attendees,
      hospitality_tip: r.hospitality_tip,
    }));

    const exportData: DatevExportData = {
      title: trip.title || trip.destination,
      destination: trip.destination,
      startDate: trip.start_datetime.split("T")[0],
      endDate: trip.end_datetime.split("T")[0],
      userName: profile?.display_name || "",
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

    // Generate EXTF CSV
    const extfCsv = generateEXTF(exportData);

    // Build ZIP
    const zip = new JSZip();

    // Add EXTF file
    zip.file("EXTF_Buchungsstapel.csv", "\uFEFF" + extfCsv); // BOM for DATEV

    // Download receipt files from Supabase Storage and add to ZIP
    const belegFolder = zip.folder("Belege")!;
    const belegFiles: Array<{ filename: string; vendor: string | null }> = [];

    for (let i = 0; i < datevReceipts.length; i++) {
      const receipt = datevReceipts[i];
      if (!receipt.image_path) continue;

      const ext = receipt.image_path.split(".").pop() || "jpg";
      const filename = generateBelegFilename(i, receipt.date, receipt.vendor_name, ext);

      // Download from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("receipts")
        .download(receipt.image_path);

      if (downloadError || !fileData) {
        console.error(`Failed to download receipt ${receipt.image_path}:`, downloadError);
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      belegFolder.file(filename, buffer);
      belegFiles.push({ filename, vendor: receipt.vendor_name });
    }

    // Generate document.xml
    const documentXml = generateDocumentXml(exportData, belegFiles);
    zip.file("document.xml", documentXml);

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    const sanitizedTitle = (trip.title || trip.destination)
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_\- ]/g, "")
      .replace(/\s+/g, "_");
    const zipFilename = `DATEV_${sanitizedTitle}_${exportData.startDate}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error) {
    console.error("DATEV export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export fehlgeschlagen" },
      { status: 500 }
    );
  }
}
