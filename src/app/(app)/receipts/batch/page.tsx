"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { ReceiptExtraction, TripAssignment } from "@/lib/types";

interface BatchItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "extracting" | "done" | "saved" | "error";
  extraction?: ReceiptExtraction;
  tripAssignment?: TripAssignment;
  imagePath?: string;
  error?: string;
}

export default function BatchUploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 20) {
      showToast("Maximal 20 Belege auf einmal.", "error");
      return;
    }

    const newItems: BatchItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending" as const,
    }));
    setItems(newItems);
  }

  function updateItem(id: string, update: Partial<BatchItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }

  async function processAll() {
    setProcessing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const item of items) {
      if (item.status !== "pending") continue;

      // Upload
      updateItem(item.id, { status: "uploading" });
      const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, item.file);

      if (uploadError) {
        updateItem(item.id, { status: "error", error: uploadError.message });
        continue;
      }

      // Extract
      updateItem(item.id, { status: "extracting", imagePath: fileName });
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePath: fileName }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Extraktion fehlgeschlagen");
        }

        const { extraction, tripAssignment } = await response.json();
        updateItem(item.id, { status: "done", extraction, tripAssignment });

        // Auto-save immediately after successful extraction
        const { error: insertError } = await supabase.from("receipts").insert({
          user_id: user.id,
          image_path: fileName,
          date: extraction.date,
          total_amount: extraction.total_amount,
          currency: extraction.currency,
          vendor_name: extraction.vendor_name,
          vendor_city: extraction.vendor_city,
          receipt_type: extraction.receipt_type,
          vat_positions: extraction.vat_positions,
          confidence: extraction.confidence,
          raw_extraction: extraction,
          trip_id: tripAssignment?.type === "existing" ? tripAssignment.tripId : null,
          trip_assignment_source: tripAssignment?.type === "existing" ? "auto_existing" : null,
          status: "confirmed",
        });
        if (insertError) {
          updateItem(item.id, { status: "error", error: insertError.message });
          continue;
        }
        updateItem(item.id, { status: "saved" as BatchItem["status"] });
      } catch (err) {
        updateItem(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Fehler",
        });
      }
    }
    setProcessing(false);
  }

  const savedCount = items.filter((i) => i.status === "saved").length;
  const doneCount = items.filter((i) => i.status === "done" || i.status === "saved").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const newDraftCount = items.filter((i) => i.tripAssignment?.type === "new_draft").length;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Batch-Upload</h1>
      <p className="mb-4 text-sm text-gray-500">
        Lade bis zu 20 Belege auf einmal hoch. Alle werden automatisch per KI analysiert.
      </p>

      {items.length === 0 ? (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <svg className="mb-3 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Mehrere Belege auswählen
            </span>
            <span className="mt-1 text-xs text-gray-500">
              JPG, PNG, HEIC oder PDF (max. 20 Dateien, je 20 MB)
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,application/pdf"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </>
      ) : (
        <div className="space-y-4">
          {/* Status summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 flex justify-between text-sm">
            <span>{items.length} Dateien</span>
            <span>
              {doneCount > 0 && <span className="text-green-600">{doneCount} fertig</span>}
              {errorCount > 0 && <span className="ml-2 text-red-600">{errorCount} Fehler</span>}
            </span>
          </div>

          {/* File list */}
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  {(item.status === "done" || item.status === "saved") && item.extraction && (
                    <p className="text-xs text-gray-500">
                      {item.extraction.vendor_name || "Unbekannt"}
                      {item.extraction.total_amount != null && ` · ${item.extraction.total_amount.toFixed(2)} ${item.extraction.currency}`}
                      {item.tripAssignment?.type === "existing" && (
                        <span className="ml-1 text-purple-600">· Reise zugeordnet</span>
                      )}
                    </p>
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-red-500">{item.error}</p>
                  )}
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!processing && doneCount < items.length - errorCount && (
              <button
                onClick={processAll}
                className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                {items.some((i) => i.status !== "pending") ? "Restliche analysieren" : `${items.length} Belege analysieren`}
              </button>
            )}
            {processing && (
              <div className="flex-1 rounded-md bg-blue-100 px-4 py-3 text-sm font-medium text-blue-700 text-center">
                Wird analysiert... ({doneCount}/{items.length})
              </div>
            )}
            {savedCount > 0 && !processing && (
              <button
                onClick={() => { router.push("/dashboard"); router.refresh(); }}
                className="flex-1 rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
              >
                {savedCount} Belege gespeichert — zum Dashboard
              </button>
            )}
          </div>

          {newDraftCount > 0 && !processing && savedCount > 0 && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-sm text-purple-700">
              {newDraftCount} {newDraftCount === 1 ? "Beleg könnte" : "Belege könnten"} zu neuen Reisen gehören.
              Ordne sie manuell über die Reise-Detailseite zu.
            </div>
          )}

          <button
            onClick={() => setItems([])}
            disabled={processing}
            className="w-full text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BatchItem["status"] }) {
  const styles = {
    pending: "bg-gray-100 text-gray-600",
    uploading: "bg-blue-100 text-blue-700",
    extracting: "bg-yellow-100 text-yellow-700",
    done: "bg-green-100 text-green-700",
    saved: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  const labels = {
    pending: "Wartend",
    uploading: "Upload...",
    extracting: "KI...",
    done: "Analysiert",
    saved: "Gespeichert",
    error: "Fehler",
  };
  return (
    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
