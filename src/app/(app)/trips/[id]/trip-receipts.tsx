"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

interface TripReceiptsProps {
  tripId: string;
  linkedReceipts: Array<{
    id: string;
    date: string | null;
    vendor_name: string | null;
    total_amount: number | null;
    currency: string;
    receipt_type: string;
  }>;
  unlinkedReceipts: Array<{
    id: string;
    date: string | null;
    vendor_name: string | null;
    total_amount: number | null;
    currency: string;
    receipt_type: string;
  }>;
}

export function TripReceipts({
  tripId,
  linkedReceipts,
  unlinkedReceipts,
}: TripReceiptsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  async function linkReceipt(receiptId: string) {
    setLinking(receiptId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("receipts")
        .update({ trip_id: tripId })
        .eq("id", receiptId);

      if (error) throw new Error(error.message);
      showToast("Beleg zugeordnet.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setLinking(null);
  }

  async function unlinkReceipt(receiptId: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("receipts")
        .update({ trip_id: null })
        .eq("id", receiptId);

      if (error) throw new Error(error.message);
      showToast("Beleg entfernt.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Belege ({linkedReceipts.length})
        </h2>
        {unlinkedReceipts.length > 0 && (
          <button
            onClick={() => setShowLinkDialog(!showLinkDialog)}
            className="text-xs font-medium text-blue-600 hover:text-blue-500"
          >
            {showLinkDialog ? "Schließen" : "+ Beleg zuordnen"}
          </button>
        )}
      </div>

      {/* Link dialog */}
      {showLinkDialog && unlinkedReceipts.length > 0 && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs text-blue-700">Nicht zugeordnete Belege:</p>
          <div className="space-y-2">
            {unlinkedReceipts.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded bg-white p-2 border border-blue-100"
              >
                <div className="text-sm">
                  <span className="text-gray-900">
                    {r.vendor_name || "Unbekannt"}
                  </span>
                  <span className="ml-2 text-gray-500">
                    {r.date
                      ? new Date(r.date).toLocaleDateString("de-DE")
                      : "–"}
                  </span>
                  <span className="ml-2 font-medium text-gray-700">
                    {r.total_amount != null ? `${Number(r.total_amount).toFixed(2)} ${r.currency}` : "–"}
                  </span>
                </div>
                <button
                  onClick={() => linkReceipt(r.id)}
                  disabled={linking === r.id}
                  className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {linking === r.id ? "..." : "Zuordnen"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked receipts */}
      {linkedReceipts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <p className="text-xs text-gray-400">Noch keine Belege zugeordnet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {linkedReceipts.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {r.vendor_name || "Unbekannt"}
                </p>
                <p className="text-xs text-gray-500">
                  {r.date ? new Date(r.date).toLocaleDateString("de-DE") : "–"}
                  {" · "}{r.receipt_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {r.total_amount != null ? `${Number(r.total_amount).toFixed(2)} ${r.currency}` : "–"}
                </span>
                <button
                  onClick={() => unlinkReceipt(r.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                  title="Beleg entfernen"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
