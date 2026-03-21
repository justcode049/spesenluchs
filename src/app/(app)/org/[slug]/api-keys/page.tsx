"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrgRole } from "@/lib/types";
import { useToast } from "@/components/toast";

interface ApiKeyDisplay {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [keys, setKeys] = useState<ApiKeyDisplay[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

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

      const res = await fetch(`/api/api-keys?organization_id=${org.id}`);
      const json = await res.json();
      setKeys(json.data || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name) return;
    setSaving(true);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setNewKey(json.data.key);
      setKeys((prev) => [json.data, ...prev]);
      setName("");
      setShowForm(false);
      showToast("API-Key erstellt!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setSaving(false);
  }

  async function handleRevoke(keyId: string) {
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Widerrufen");

      setKeys((prev) =>
        prev.map((k) =>
          k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
        )
      );
      showToast("API-Key widerrufen.");
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
    return (
      <div className="p-4 text-sm text-gray-500">Nur Administratoren können API-Keys verwalten.</div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">API-Keys</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Neuer Key
        </button>
      </div>

      {/* New key display */}
      {newKey && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700 mb-2">
            API-Key erstellt. Kopiere den Key jetzt – er wird nicht erneut angezeigt.
          </p>
          <code className="block rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 border border-green-200 break-all">
            {newKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
              showToast("In Zwischenablage kopiert!");
            }}
            className="mt-2 text-xs font-medium text-green-700 hover:text-green-600"
          >
            Kopieren
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 ml-4 text-xs text-gray-500 hover:text-gray-400"
          >
            Schließen
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="z.B. DATEV Integration"
            />
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

      {keys.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine API-Keys erstellt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`flex items-center justify-between rounded-lg border bg-white p-4 ${
                key.revoked_at ? "border-red-200 opacity-60" : "border-gray-200"
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">{key.name}</p>
                <p className="text-xs text-gray-500">
                  {key.key_prefix}... · Erstellt {new Date(key.created_at).toLocaleDateString("de-DE")}
                  {key.last_used_at && ` · Zuletzt ${new Date(key.last_used_at).toLocaleDateString("de-DE")}`}
                  {key.revoked_at && " · Widerrufen"}
                </p>
              </div>
              {!key.revoked_at && (
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="ml-4 rounded-md px-3 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Widerrufen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
