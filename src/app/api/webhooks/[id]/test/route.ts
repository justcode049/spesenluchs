import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { data: webhook } = await supabase
      .from("webhooks")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!webhook) return NextResponse.json({ error: "Webhook nicht gefunden" }, { status: 404 });

    await dispatchWebhookEvent(webhook.organization_id, "trip.submitted", {
      test: true,
      trip_id: "00000000-0000-0000-0000-000000000000",
      title: "Test-Reise",
      destination: "Berlin",
      status: "submitted",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
