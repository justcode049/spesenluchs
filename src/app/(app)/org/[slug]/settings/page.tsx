"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Organization, OrgRole } from "@/lib/types";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveStatusIndicator } from "@/components/save-status";

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [name, setName] = useState("");
  const [requireCostCenter, setRequireCostCenter] = useState(false);
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
      setRequireCostCenter(orgData.require_cost_center ?? false);
      setRole((membership?.role as OrgRole) || null);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  const saveFn = useCallback(async () => {
    if (!org || role !== "admin") return;
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ name, require_cost_center: requireCostCenter, updated_at: new Date().toISOString() })
      .eq("id", org.id);
    if (error) throw new Error(error.message);
  }, [org, role, name, requireCostCenter]);

  const saveStatus = useAutoSave(loading ? null : `${name}|${requireCostCenter}`, saveFn, 800);

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
          <>
            <Link
              href={`/org/${slug}/audit`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Audit-Log
            </Link>
            <Link
              href={`/org/${slug}/cost-centers`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Kostenstellen
            </Link>
            <Link
              href={`/org/${slug}/api-keys`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              API-Keys
            </Link>
            <Link
              href={`/org/${slug}/webhooks`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Webhooks
            </Link>
            <Link
              href={`/org/${slug}/sso`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              SSO
            </Link>
            <Link
              href={`/org/${slug}/integrations`}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Integrationen
            </Link>
          </>
        )}
      </div>

      {role === "admin" ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Organisationsname</label>
              <SaveStatusIndicator status={saveStatus} />
            </div>
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

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requireCostCenter}
                onChange={(e) => setRequireCostCenter(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="font-medium text-gray-700">Kostenstelle bei Reisen als Pflichtfeld</span>
            </label>
            <p className="mt-1 text-xs text-gray-400 ml-6">
              Wenn aktiviert, müssen Mitarbeiter bei jeder Reise eine Kostenstelle auswählen.
            </p>
          </div>
        </div>
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
