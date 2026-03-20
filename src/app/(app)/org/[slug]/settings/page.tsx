"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import type { Organization, OrgRole } from "@/lib/types";

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const slug = params.slug as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!orgData) {
        router.push("/dashboard");
        return;
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("organization_id", orgData.id)
        .eq("user_id", user.id)
        .single();

      setOrg(orgData);
      setName(orgData.name);
      setRole((membership?.role as OrgRole) || null);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org || role !== "admin") return;

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", org.id);

    if (error) {
      showToast("Fehler beim Speichern", "error");
    } else {
      showToast("Gespeichert!");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/profile" className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">{org.name}</h1>

      <div className="mb-6 flex gap-2">
        <Link
          href={`/org/${slug}/members`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Mitglieder
        </Link>
        <Link
          href={`/org/${slug}/dashboard`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Team-Dashboard
        </Link>
        <Link
          href={`/org/${slug}/approvals`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Genehmigungen
        </Link>
        {role === "admin" && (
          <Link
            href={`/org/${slug}/audit`}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Audit-Log
          </Link>
        )}
      </div>

      {role === "admin" ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Organisationsname</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Slug (URL)</label>
            <p className="mt-1 text-sm text-gray-500">{org.slug}</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">
            Deine Rolle: <span className="font-medium">{role}</span>
          </p>
        </div>
      )}
    </div>
  );
}
