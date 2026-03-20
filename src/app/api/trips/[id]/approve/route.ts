import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approveTrip } from "@/lib/approval";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const result = await approveTrip(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler bei der Genehmigung" },
      { status: 400 }
    );
  }
}
