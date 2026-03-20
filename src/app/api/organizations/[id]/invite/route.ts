import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Check if user is admin/manager in this org
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["admin", "manager"].includes(membership.role)) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email ist erforderlich" }, { status: 400 });
    }

    const validRoles = ["employee", "manager", "admin"];
    const inviteRole = validRoles.includes(role) ? role : "employee";

    const { data: invitation, error } = await supabase
      .from("invitations")
      .insert({
        organization_id: orgId,
        email,
        role: inviteRole,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Diese Email wurde bereits eingeladen" },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Einladen" },
      { status: 500 }
    );
  }
}
