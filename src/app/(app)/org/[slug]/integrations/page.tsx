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

const ERP_DESCRIPTIONS: Record<ErpType, string> = {
  datev: "DATEV-Export mit EXTF-Buchungsstapel, Belegverknüpfung und SKR03-Kontenmapping.",
  sap: "SAP IDoc-Export (BAPI_ACC_DOCUMENT_POST) für automatische Buchungsübernahme.",
  enventa: "Direkte Übermittlung der Reisekosten an enventa via REST-API.",
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
  const [saving, setSaving] = useState(false);

  // DATEV fields
  const [datevBeraternr, setDatevBeraternr] = useState("");
  const [datevMandantennr, setDatevMandantennr] = useState("");
  const [datevKontolänge, setDatevKontolänge] = useState("4");

  // SAP fields
  const [sapCompanyCode, setSapCompanyCode] = useState("1000");
  const [sapHost, setSapHost] = useState("");
  const [sapClient, setSapClient] = useState("");

  // enventa fields
  const [enventaBaseUrl, setEnventaBaseUrl] = useState("");
  const [enventaApiKey, setEnventaApiKey] = useState("");
  const [enventaMandantId, setEnventaMandantId] = useState("");

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

  function buildConfig(): Record<string, unknown> {
    switch (erpType) {
      case "datev":
        return {
          berater_nr: datevBeraternr || undefined,
          mandanten_nr: datevMandantennr || undefined,
          kontolänge: parseInt(datevKontolänge) || 4,
        };
      case "sap":
        return {
          company_code: sapCompanyCode || "1000",
          host: sapHost || undefined,
          client: sapClient || undefined,
        };
      case "enventa":
        return {
          base_url: enventaBaseUrl,
          api_key: enventaApiKey,
          mandant_id: enventaMandantId,
        };
    }
  }

  function validateForm(): string | null {
    if (erpType === "enventa") {
      if (!enventaBaseUrl) return "enventa Base-URL ist ein Pflichtfeld.";
      if (!enventaApiKey) return "enventa API-Key ist ein Pflichtfeld.";
      if (!enventaMandantId) return "enventa Mandanten-ID ist ein Pflichtfeld.";
      try { new URL(enventaBaseUrl); } catch { return "Ungültige Base-URL."; }
    }
    return null;
  }

  function resetForm() {
    setDatevBeraternr("");
    setDatevMandantennr("");
    setDatevKontolänge("4");
    setSapCompanyCode("1000");
    setSapHost("");
    setSapClient("");
    setEnventaBaseUrl("");
    setEnventaApiKey("");
    setEnventaMandantId("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;

    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("erp_configs")
        .insert({
          organization_id: orgId,
          erp_type: erpType,
          config: buildConfig(),
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
      resetForm();
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

  function configSummary(config: ErpConfig): string {
    const c = config.config as Record<string, unknown>;
    switch (config.erp_type) {
      case "datev":
        return [
          c.berater_nr && `Berater ${c.berater_nr}`,
          c.mandanten_nr && `Mandant ${c.mandanten_nr}`,
        ].filter(Boolean).join(" · ") || "Standard-Einstellungen";
      case "sap":
        return [
          `Buchungskreis ${c.company_code || "1000"}`,
          c.host && `Host: ${c.host}`,
        ].filter(Boolean).join(" · ");
      case "enventa":
        return [
          c.base_url && `${c.base_url}`,
          c.mandant_id && `Mandant: ${c.mandant_id}`,
        ].filter(Boolean).join(" · ");
      default:
        return "";
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
            onClick={() => { setShowForm(!showForm); setErpType(availableTypes[0]); }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Neu
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 space-y-4">
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
            <p className="mt-1 text-xs text-gray-400">{ERP_DESCRIPTIONS[erpType]}</p>
          </div>

          {/* DATEV fields */}
          {erpType === "datev" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Berater-Nr.</label>
                  <input type="text" value={datevBeraternr} onChange={(e) => setDatevBeraternr(e.target.value)} className={inputClass} placeholder="z.B. 1234567" />
                  <p className="mt-1 text-xs text-gray-400">Optional – für EXTF-Header</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mandanten-Nr.</label>
                  <input type="text" value={datevMandantennr} onChange={(e) => setDatevMandantennr(e.target.value)} className={inputClass} placeholder="z.B. 12345" />
                  <p className="mt-1 text-xs text-gray-400">Optional – für EXTF-Header</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sachkontenlänge</label>
                <select value={datevKontolänge} onChange={(e) => setDatevKontolänge(e.target.value)} className={inputClass}>
                  <option value="4">4-stellig (Standard)</option>
                  <option value="5">5-stellig</option>
                  <option value="6">6-stellig</option>
                </select>
              </div>
            </>
          )}

          {/* SAP fields */}
          {erpType === "sap" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Buchungskreis (Company Code)</label>
                <input type="text" value={sapCompanyCode} onChange={(e) => setSapCompanyCode(e.target.value)} className={inputClass} placeholder="1000" />
                <p className="mt-1 text-xs text-gray-400">SAP Buchungskreis für BAPI_ACC_DOCUMENT_POST</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SAP Host</label>
                <input type="text" value={sapHost} onChange={(e) => setSapHost(e.target.value)} className={inputClass} placeholder="z.B. sap.firma.de (optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SAP Client</label>
                <input type="text" value={sapClient} onChange={(e) => setSapClient(e.target.value)} className={inputClass} placeholder="z.B. 100 (optional)" />
              </div>
            </>
          )}

          {/* enventa fields */}
          {erpType === "enventa" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Base-URL <span className="text-red-500">*</span>
                </label>
                <input type="url" required value={enventaBaseUrl} onChange={(e) => setEnventaBaseUrl(e.target.value)} className={inputClass} placeholder="https://enventa.firma.de" />
                <p className="mt-1 text-xs text-gray-400">REST-API Endpunkt der enventa-Instanz</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  API-Key <span className="text-red-500">*</span>
                </label>
                <input type="password" required value={enventaApiKey} onChange={(e) => setEnventaApiKey(e.target.value)} className={inputClass} placeholder="API-Schlüssel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mandanten-ID <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={enventaMandantId} onChange={(e) => setEnventaMandantId(e.target.value)} className={inputClass} placeholder="z.B. 001" />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Wird erstellt..." : "Erstellen"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
                  {" · "}{configSummary(config)}
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
