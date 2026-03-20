import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = user.id;

    // Collect all user data (DSGVO Art. 20)
    const [
      { data: profile },
      { data: trips },
      { data: receipts },
      { data: mileage },
      { data: memberships },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("trips").select("*").eq("user_id", userId),
      supabase.from("receipts").select("*").eq("user_id", userId),
      supabase.from("mileage").select("*").eq("user_id", userId),
      supabase.from("memberships").select("*, organization:organizations(*)").eq("user_id", userId),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: user.email,
      },
      profile,
      trips: trips || [],
      receipts: (receipts || []).map(({ raw_extraction, ...rest }) => rest),
      mileage: mileage || [],
      memberships: memberships || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="spesenluchs-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Export" },
      { status: 500 }
    );
  }
}
