"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CostCenter, OrgRole } from "@/lib/types";
import { useToast } from "@/components/toast";

export default function CostCentersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
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

      const res = await fetch(`/api/cost-centers?organization_id=${org.id}`);
      const json = await res.json();
      setCostCenters(json.data || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !number || !name) return;
    setSaving(true);

    try {
      const res = await fetch("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId, number, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setCostCenters((prev) => [...prev, json.data]);
      setNumber("");
      setName("");
      setShowForm(false);
      showToast("Kostenstelle erstellt!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setSaving(false);
  }

  async function handleToggleActive(cc: CostCenter) {
    try {
      const res = await fetch(`/api/cost-centers/${cc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !cc.active }),
      });
      if (!res.ok) throw new Error("Fehler beim Aktualisieren");

      setCostCenters((prev) =>
        prev.map((c) => (c.id === cc.id ? { ...c, active: !c.active } : c))
      );
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

  const isAdmin = role === "admin";

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Kostenstellen</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/org/${slug}/cost-centers/import`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              CSV Import
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neu
            </button>
          </div>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nummer</label>
              <input type="text" required value={number} onChange={(e) => setNumber(e.target.value)} className={inputClass} placeholder="z.B. 4711" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="z.B. Vertrieb" />
            </div>
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

      {costCenters.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine Kostenstellen angelegt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {costCenters.map((cc) => (
            <div key={cc.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <Link href={`/org/${slug}/cost-centers/${cc.id}`} className="flex-1">
                <p className="font-medium text-gray-900">{cc.number} – {cc.name}</p>
                <p className="text-xs text-gray-500">
                  {cc.active ? "Aktiv" : "Inaktiv"}
                  {cc.valid_from && ` · Ab ${new Date(cc.valid_from).toLocaleDateString("de-DE")}`}
                  {cc.valid_to && ` · Bis ${new Date(cc.valid_to).toLocaleDateString("de-DE")}`}
                </p>
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleToggleActive(cc)}
                  className={`ml-4 rounded-md px-3 py-1 text-xs font-medium ${
                    cc.active
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {cc.active ? "Deaktivieren" : "Aktivieren"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
