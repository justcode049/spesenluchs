"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ErpConfig, OrgRole, ErpType } from "@/lib/types";
import { useToast } from "@/components/toast";

const ERP_LABELS: Record<ErpType, string> = {
  datev: "DATEV",
  sap: "SAP",
  enventa: "enventa",
};

export default function IntegrationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [configs, setConfigs] = useState<ErpConfig[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [erpType, setErpType] = useState<ErpType>("datev");
  const [configJson, setConfigJson] = useState("{}");
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

      const { data: erpConfigs } = await supabase
        .from("erp_configs")
        .select("*")
        .eq("organization_id", org.id);

      setConfigs(erpConfigs || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);

    try {
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(configJson);
      } catch {
        showToast("Ungültiges JSON in der Konfiguration.", "error");
        setSaving(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("erp_configs")
        .insert({
          organization_id: orgId,
          erp_type: erpType,
          config: parsedConfig,
          enabled: false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          showToast(`${ERP_LABELS[erpType]} ist bereits konfiguriert.`, "error");
        } else {
          throw new Error(error.message);
        }
        setSaving(false);
        return;
      }

      setConfigs((prev) => [...prev, data]);
      setShowForm(false);
      setConfigJson("{}");
      showToast("Integration erstellt!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setSaving(false);
  }

  async function handleToggleEnabled(config: ErpConfig) {
    const supabase = createClient();
    const { error } = await supabase
      .from("erp_configs")
      .update({ enabled: !config.enabled, updated_at: new Date().toISOString() })
      .eq("id", config.id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setConfigs((prev) =>
      prev.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (role !== "admin") {
    return <div className="p-4 text-sm text-gray-500">Nur Administratoren können Integrationen verwalten.</div>;
  }

  const configuredTypes = new Set(configs.map((c) => c.erp_type));
  const availableTypes = (["datev", "sap", "enventa"] as ErpType[]).filter(
    (t) => !configuredTypes.has(t)
  );

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ERP-Integrationen</h1>
        {availableTypes.length > 0 && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Neu
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">ERP-System</label>
            <select
              value={erpType}
              onChange={(e) => setErpType(e.target.value as ErpType)}
              className={inputClass}
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>{ERP_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Konfiguration (JSON)</label>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className={inputClass + " font-mono text-xs"}
              rows={5}
              placeholder={erpType === "sap"
                ? '{"company_code": "1000"}'
                : erpType === "enventa"
                  ? '{"base_url": "https://...", "api_key": "...", "mandant_id": "..."}'
                  : '{}'
              }
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

      {configs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine ERP-Integrationen konfiguriert.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div key={config.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">
                  {ERP_LABELS[config.erp_type as ErpType] || config.erp_type}
                </p>
                <p className="text-xs text-gray-500">
                  {config.enabled ? "Aktiv" : "Inaktiv"}
                  {" · Erstellt " + new Date(config.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <button
                onClick={() => handleToggleEnabled(config)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  config.enabled
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {config.enabled ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
