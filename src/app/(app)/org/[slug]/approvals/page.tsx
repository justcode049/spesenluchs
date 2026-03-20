"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

interface PendingTrip {
  id: string;
  title: string | null;
  destination: string;
  start_datetime: string;
  end_datetime: string;
  submitted_at: string;
  user_id: string;
  profile: { display_name: string | null } | null;
}

export default function OrgApprovalsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const slug = params.slug as string;

  const [trips, setTrips] = useState<PendingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!org) return;

      const { data } = await supabase
        .from("trips")
        .select("id, title, destination, start_datetime, end_datetime, submitted_at, user_id, profile:profiles(display_name)")
        .eq("organization_id", org.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true });

      setTrips((data || []) as unknown as PendingTrip[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleApprove(tripId: string) {
    setProcessing(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Reise genehmigt!");
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setProcessing(null);
  }

  async function handleReject(tripId: string) {
    if (!rejectComment.trim()) {
      showToast("Bitte Ablehnungsgrund angeben", "error");
      return;
    }
    setProcessing(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: rejectComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Reise abgelehnt.");
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      setRejectingId(null);
      setRejectComment("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setProcessing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Offene Genehmigungen</h1>

      {trips.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Keine offenen Genehmigungen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
            >
              <div>
                <Link
                  href={`/trips/${trip.id}`}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {trip.title || trip.destination}
                </Link>
                <p className="text-sm text-gray-500">
                  {(trip.profile as { display_name: string | null } | null)?.display_name || "Unbekannt"}
                  {" · "}
                  {new Date(trip.start_datetime).toLocaleDateString("de-DE")} –{" "}
                  {new Date(trip.end_datetime).toLocaleDateString("de-DE")}
                </p>
                {trip.submitted_at && (
                  <p className="text-xs text-gray-400">
                    Eingereicht: {new Date(trip.submitted_at).toLocaleDateString("de-DE")}
                  </p>
                )}
              </div>

              {rejectingId === trip.id ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Ablehnungsgrund..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(trip.id)}
                      disabled={processing === trip.id}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Ablehnen
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectComment("");
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(trip.id)}
                    disabled={processing === trip.id}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Genehmigen
                  </button>
                  <button
                    onClick={() => setRejectingId(trip.id)}
                    disabled={processing === trip.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
