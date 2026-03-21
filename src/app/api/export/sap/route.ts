import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculatePerDiems } from "@/lib/per-diem";
import { generateSapIDoc, SapExportData } from "@/lib/export-sap";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { tripId } = await request.json();
    if (!tripId) return NextResponse.json({ error: "tripId fehlt" }, { status: 400 });

    const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();
    if (!trip) return NextResponse.json({ error: "Reise nicht gefunden" }, { status: 404 });

    // Verify access
    if (trip.user_id !== user.id && trip.organization_id) {
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

    // Load ERP config
    const { data: erpConfig } = await supabase
      .from("erp_configs")
      .select("config")
      .eq("organization_id", trip.organization_id)
      .eq("erp_type", "sap")
      .eq("enabled", true)
      .single();

    if (!erpConfig) return NextResponse.json({ error: "SAP-Integration nicht konfiguriert" }, { status: 400 });

    const [{ data: profile }, { data: receipts }, { data: mileageEntries }, ccResult] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", trip.user_id).single(),
      supabase.from("receipts").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("mileage").select("*").eq("trip_id", tripId).order("date"),
      trip.cost_center_id
        ? supabase.from("cost_centers").select("number").eq("id", trip.cost_center_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const allowances = calculatePerDiems(trip.start_datetime, trip.end_datetime, trip.country, trip.meal_deductions || []);
    const sapConfig = erpConfig.config as { company_code?: string };

    const exportData: SapExportData = {
      title: trip.title || trip.destination,
      destination: trip.destination,
      startDate: trip.start_datetime.split("T")[0],
      endDate: trip.end_datetime.split("T")[0],
      userName: profile?.display_name || "",
      costCenter: ccResult?.data?.number,
      companyCode: sapConfig.company_code || "1000",
      allowances,
      receipts: (receipts || []).map((r) => ({
        date: r.date, vendor_name: r.vendor_name, total_amount: r.total_amount,
        currency: r.currency, receipt_type: r.receipt_type,
      })),
      mileage: (mileageEntries || []).map((m) => ({
        date: m.date, start_location: m.start_location, end_location: m.end_location,
        total_amount: Number(m.total_amount),
      })),
    };

    const xml = generateSapIDoc(exportData);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="SAP_IDoc_${tripId}.xml"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SAP-Export fehlgeschlagen" },
      { status: 500 }
    );
  }
}
