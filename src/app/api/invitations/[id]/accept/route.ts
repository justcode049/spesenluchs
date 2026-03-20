import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Load invitation
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", id)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: "Einladung nicht gefunden" }, { status: 404 });
    }

    // Verify email matches
    if (invitation.email !== user.email) {
      return NextResponse.json(
        { error: "Diese Einladung ist für eine andere Email-Adresse" },
        { status: 403 }
      );
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Einladung ist abgelaufen" }, { status: 410 });
    }

    // Check already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ error: "Einladung wurde bereits angenommen" }, { status: 409 });
    }

    // Create membership
    const { error: memberError } = await supabase
      .from("memberships")
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
      });

    if (memberError) {
      if (memberError.code === "23505") {
        return NextResponse.json({ error: "Du bist bereits Mitglied" }, { status: 409 });
      }
      throw new Error(memberError.message);
    }

    // Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ success: true, organizationId: invitation.organization_id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
