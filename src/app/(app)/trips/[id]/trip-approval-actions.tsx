"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

interface Props {
  tripId: string;
  status: string;
  isOwner: boolean;
  isReviewer: boolean;
  hasOrg: boolean;
}

export function TripApprovalActions({ tripId, status, isOwner, isReviewer, hasOrg }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Reise eingereicht!");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setLoading(false);
  }

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Reise genehmigt!");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setLoading(false);
  }

  async function handleReject() {
    if (!rejectComment.trim()) {
      showToast("Bitte Ablehnungsgrund angeben", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: rejectComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Reise abgelehnt.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setLoading(false);
  }

  // Owner can submit draft trips that belong to an org
  if (isOwner && hasOrg && (status === "draft" || status === "rejected")) {
    return (
      <div className="mb-6">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Wird eingereicht..." : "Zur Genehmigung einreichen"}
        </button>
      </div>
    );
  }

  // Reviewer can approve/reject submitted trips
  if (isReviewer && status === "submitted") {
    return (
      <div className="mb-6 space-y-3">
        {showReject ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Ablehnungsgrund..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={loading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Ablehnen
              </button>
              <button
                onClick={() => setShowReject(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "..." : "Genehmigen"}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={loading}
              className="flex-1 rounded-md border border-red-300 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Ablehnen
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
