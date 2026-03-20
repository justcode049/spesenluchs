import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rejectTrip } from "@/lib/approval";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { comment } = await request.json();
    if (!comment) {
      return NextResponse.json(
        { error: "Ablehnungsgrund ist erforderlich" },
        { status: 400 }
      );
    }

    const result = await rejectTrip(id, user.id, comment);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler bei der Ablehnung" },
      { status: 400 }
    );
  }
}
