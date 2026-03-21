import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("organization_id");
    if (!orgId) return NextResponse.json({ error: "organization_id fehlt" }, { status: 400 });

    const { data, error } = await supabase
      .from("cost_objects")
      .select("*")
      .eq("organization_id", orgId)
      .order("number");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json();
    const { organization_id, number, name, valid_from, valid_to } = body;

    if (!organization_id || !number || !name) {
      return NextResponse.json({ error: "organization_id, number und name sind Pflichtfelder" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cost_objects")
      .insert({
        organization_id,
        number,
        name,
        valid_from: valid_from || null,
        valid_to: valid_to || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kostenträger mit dieser Nummer existiert bereits" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
