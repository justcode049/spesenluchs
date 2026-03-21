"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Webhook, WebhookDelivery } from "@/lib/types";
import { useToast } from "@/components/toast";

export default function WebhookDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const webhookId = params.id as string;
  const { showToast } = useToast();

  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function load() {
      const [whRes, delRes] = await Promise.all([
        fetch(`/api/webhooks/${webhookId}`),
        fetch(`/api/webhooks/${webhookId}/deliveries`),
      ]);

      const whJson = await whRes.json();
      const delJson = await delRes.json();

      setWebhook(whJson.data || null);
      setDeliveries(delJson.data || []);
      setLoading(false);
    }
    load();
  }, [webhookId]);

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/test`, { method: "POST" });
      if (!res.ok) throw new Error("Test fehlgeschlagen");
      showToast("Test-Event gesendet!");

      // Reload deliveries
      const delRes = await fetch(`/api/webhooks/${webhookId}/deliveries`);
      const delJson = await delRes.json();
      setDeliveries(delJson.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setTesting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!webhook) return null;

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/webhooks`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Webhook Details</h1>
        <p className="text-sm text-gray-500 break-all">{webhook.url}</p>
        <p className="text-xs text-gray-400 mt-1">
          Secret: <code className="bg-gray-100 px-1 rounded">{webhook.secret}</code>
        </p>
      </div>

      <button
        onClick={handleTest}
        disabled={testing}
        className="mb-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {testing ? "Wird gesendet..." : "Test-Event senden"}
      </button>

      <h2 className="mb-3 text-sm font-semibold text-gray-700">Delivery-Log</h2>

      {deliveries.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Deliveries.</p>
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className={`rounded-lg border p-3 ${
                d.delivered_at
                  ? "border-green-200 bg-green-50"
                  : d.next_retry_at
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.event}</p>
                  <p className="text-xs text-gray-500">
                    Versuch {d.attempt}
                    {d.response_status && ` · Status ${d.response_status}`}
                    {d.delivered_at && ` · Zugestellt`}
                    {d.next_retry_at && ` · Retry ${new Date(d.next_retry_at).toLocaleString("de-DE")}`}
                    {!d.delivered_at && !d.next_retry_at && ` · Fehlgeschlagen`}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(d.created_at).toLocaleString("de-DE")}
                </p>
              </div>
              {d.response_body && (
                <pre className="mt-2 rounded bg-white p-2 text-xs text-gray-600 max-h-20 overflow-auto border">
                  {d.response_body.substring(0, 500)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
