import { createClient } from "@/lib/supabase/server";
import { computeReceiptHash, computeTripHash } from "./gobd";

export async function submitTrip(tripId: string, userId: string) {
  const supabase = await createClient();

  // Load trip
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", userId)
    .single();

  if (tripError || !trip) throw new Error("Reise nicht gefunden");
  if (trip.status !== "draft") throw new Error("Nur Entwürfe können eingereicht werden");

  // Load receipts for this trip
  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
    .eq("trip_id", tripId);

  // Load mileage for this trip
  const { data: mileageEntries } = await supabase
    .from("mileage")
    .select("*")
    .eq("trip_id", tripId);

  // Lock all receipts and compute hashes
  for (const receipt of receipts || []) {
    const hash = computeReceiptHash(receipt);
    await supabase
      .from("receipts")
      .update({ locked_at: new Date().toISOString(), content_hash: hash })
      .eq("id", receipt.id);
  }

  // Compute trip hash and lock
  const tripHash = computeTripHash(trip, receipts || [], mileageEntries || []);
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("trips")
    .update({
      status: "submitted",
      submitted_at: now,
      locked_at: now,
      content_hash: tripHash,
    })
    .eq("id", tripId);

  if (updateError) throw new Error(updateError.message);

  // Write audit log
  await supabase.from("audit_log").insert({
    user_id: userId,
    organization_id: trip.organization_id,
    entity_type: "trip",
    entity_id: tripId,
    action: "submit",
    changes: { status: { old: "draft", new: "submitted" } },
  });

  return { success: true };
}

export async function approveTrip(tripId: string, reviewerId: string) {
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) throw new Error("Reise nicht gefunden");
  if (trip.status !== "submitted") throw new Error("Nur eingereichte Reisen können genehmigt werden");

  // Verify reviewer is manager/admin in the org
  if (trip.organization_id) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", trip.organization_id)
      .eq("user_id", reviewerId)
      .single();

    if (!membership || !["manager", "admin"].includes(membership.role)) {
      throw new Error("Keine Berechtigung zur Genehmigung");
    }
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("trips")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: now,
    })
    .eq("id", tripId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("audit_log").insert({
    user_id: reviewerId,
    organization_id: trip.organization_id,
    entity_type: "trip",
    entity_id: tripId,
    action: "approve",
    changes: { status: { old: "submitted", new: "approved" } },
  });

  return { success: true };
}

export async function rejectTrip(tripId: string, reviewerId: string, comment: string) {
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) throw new Error("Reise nicht gefunden");
  if (trip.status !== "submitted") throw new Error("Nur eingereichte Reisen können abgelehnt werden");

  // Verify reviewer is manager/admin
  if (trip.organization_id) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", trip.organization_id)
      .eq("user_id", reviewerId)
      .single();

    if (!membership || !["manager", "admin"].includes(membership.role)) {
      throw new Error("Keine Berechtigung zur Ablehnung");
    }
  }

  const now = new Date().toISOString();

  // Unlock trip and receipts for editing
  const { error: updateError } = await supabase
    .from("trips")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: now,
      rejection_comment: comment,
      locked_at: null,
      content_hash: null,
    })
    .eq("id", tripId);

  if (updateError) throw new Error(updateError.message);

  // Unlock receipts
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id")
    .eq("trip_id", tripId);

  for (const receipt of receipts || []) {
    await supabase
      .from("receipts")
      .update({ locked_at: null, content_hash: null })
      .eq("id", receipt.id);
  }

  await supabase.from("audit_log").insert({
    user_id: reviewerId,
    organization_id: trip.organization_id,
    entity_type: "trip",
    entity_id: tripId,
    action: "reject",
    changes: {
      status: { old: "submitted", new: "rejected" },
      rejection_comment: { old: null, new: comment },
    },
  });

  return { success: true };
}
