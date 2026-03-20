import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = user.id;

    // Anonymize audit log entries
    await supabase
      .from("audit_log")
      .update({ user_id: null, changes: null })
      .eq("user_id", userId);

    // Delete mileage entries
    await supabase.from("mileage").delete().eq("user_id", userId);

    // Delete receipts
    await supabase.from("receipts").delete().eq("user_id", userId);

    // Delete trips
    await supabase.from("trips").delete().eq("user_id", userId);

    // Delete memberships
    await supabase.from("memberships").delete().eq("user_id", userId);

    // Delete profile
    await supabase.from("profiles").delete().eq("id", userId);

    // Delete storage files
    const { data: files } = await supabase.storage
      .from("receipts")
      .list(userId);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("receipts").remove(paths);
    }

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
