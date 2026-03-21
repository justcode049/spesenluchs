"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Webhook, OrgRole } from "@/lib/types";
import { useToast } from "@/components/toast";

const AVAILABLE_EVENTS = [
  { value: "trip.submitted", label: "Reise eingereicht" },
  { value: "trip.approved", label: "Reise genehmigt" },
  { value: "trip.rejected", label: "Reise abgelehnt" },
  { value: "trip.exported", label: "Reise exportiert" },
];

export default function WebhooksPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();
      if (!org) return;

      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("organization_id", org.id)
        .eq("user_id", user.id)
        .single();

      setOrgId(org.id);
      setRole((membership?.role as OrgRole) || null);

      const res = await fetch(`/api/webhooks?organization_id=${org.id}`);
      const json = await res.json();
      setWebhooks(json.data || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !url) return;
    setSaving(true);

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId, url, events: selectedEvents }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setWebhooks((prev) => [json.data, ...prev]);
      setUrl("");
      setSelectedEvents([]);
      setShowForm(false);
      showToast("Webhook erstellt!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setSaving(false);
  }

  async function handleToggleActive(wh: Webhook) {
    try {
      const res = await fetch(`/api/webhooks/${wh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !wh.active }),
      });
      if (!res.ok) throw new Error("Fehler");

      setWebhooks((prev) =>
        prev.map((w) => (w.id === wh.id ? { ...w, active: !w.active } : w))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
  }

  async function handleDelete(whId: string) {
    try {
      const res = await fetch(`/api/webhooks/${whId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler");

      setWebhooks((prev) => prev.filter((w) => w.id !== whId));
      showToast("Webhook gelöscht.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (role !== "admin") {
    return <div className="p-4 text-sm text-gray-500">Nur Administratoren können Webhooks verwalten.</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Webhooks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Neu
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">URL</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
            <div className="space-y-1">
              {AVAILABLE_EVENTS.map((evt) => (
                <label key={evt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(evt.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEvents((prev) => [...prev, evt.value]);
                      } else {
                        setSelectedEvents((prev) => prev.filter((v) => v !== evt.value));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  {evt.label} <span className="text-xs text-gray-400">({evt.value})</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">Leer = alle Events</p>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Wird erstellt..." : "Erstellen"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {webhooks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine Webhooks konfiguriert.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <Link href={`/org/${slug}/webhooks/${wh.id}`} className="flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">{wh.url}</p>
                <p className="text-xs text-gray-500">
                  {wh.active ? "Aktiv" : "Inaktiv"}
                  {wh.events.length > 0 ? ` · ${wh.events.length} Events` : " · Alle Events"}
                </p>
              </Link>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleToggleActive(wh)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    wh.active ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                  }`}
                >
                  {wh.active ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button
                  onClick={() => handleDelete(wh.id)}
                  className="rounded-md px-3 py-1 text-xs font-medium bg-red-100 text-red-700"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
