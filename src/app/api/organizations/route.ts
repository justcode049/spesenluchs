import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { data: memberships } = await supabase
      .from("memberships")
      .select("role, organization:organizations(*)")
      .eq("user_id", user.id);

    return NextResponse.json({ organizations: memberships || [] });
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

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/[ß]/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug })
      .select()
      .single();

    if (orgError) throw new Error(orgError.message);

    // Add creator as admin
    const { error: memberError } = await supabase
      .from("memberships")
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: "admin",
      });

    if (memberError) throw new Error(memberError.message);

    return NextResponse.json({ organization: org });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Erstellen" },
      { status: 500 }
    );
  }
}
