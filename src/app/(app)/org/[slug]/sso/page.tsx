"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SsoConfig, OrgRole } from "@/lib/types";
import { useToast } from "@/components/toast";

export default function SsoConfigPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [autoProvision, setAutoProvision] = useState(true);

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

      const res = await fetch(`/api/sso-configs?organization_id=${org.id}`);
      const json = await res.json();
      const configs = json.data || [];

      if (configs.length > 0) {
        const c = configs[0];
        setConfig(c);
        setTenantId(c.tenant_id);
        setClientId(c.client_id);
        setEmailDomain(c.email_domain);
        setAutoProvision(c.auto_provision);
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);

    try {
      if (config) {
        // Update existing
        const body: Record<string, unknown> = {
          tenant_id: tenantId,
          client_id: clientId,
          email_domain: emailDomain,
          auto_provision: autoProvision,
        };
        if (clientSecret) body.client_secret = clientSecret;

        const res = await fetch(`/api/sso-configs/${config.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("SSO-Konfiguration gespeichert!");
      } else {
        // Create new
        if (!clientSecret) {
          showToast("Client Secret ist ein Pflichtfeld.", "error");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/sso-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: orgId,
            tenant_id: tenantId,
            client_id: clientId,
            client_secret: clientSecret,
            email_domain: emailDomain,
            auto_provision: autoProvision,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setConfig(json.data);
        showToast("SSO-Konfiguration erstellt!");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setSaving(false);
  }

  async function handleToggleEnabled() {
    if (!config) return;
    try {
      const res = await fetch(`/api/sso-configs/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      if (!res.ok) throw new Error("Fehler");
      setConfig({ ...config, enabled: !config.enabled });
      showToast(config.enabled ? "SSO deaktiviert." : "SSO aktiviert!");
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
    return <div className="p-4 text-sm text-gray-500">Nur Administratoren können SSO konfigurieren.</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Enterprise SSO (Microsoft Azure AD)</h1>

      {config && (
        <div className="mb-6 flex items-center gap-3">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            config.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}>
            {config.enabled ? "Aktiv" : "Inaktiv"}
          </span>
          <button
            onClick={handleToggleEnabled}
            className="text-xs font-medium text-blue-600 hover:text-blue-500"
          >
            {config.enabled ? "Deaktivieren" : "Aktivieren"}
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Azure AD Tenant ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className={inputClass}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client ID (Application ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client Secret {!config && <span className="text-red-500">*</span>}
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className={inputClass}
            placeholder={config ? "Leer lassen um beizubehalten" : ""}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email-Domain <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={emailDomain}
            onChange={(e) => setEmailDomain(e.target.value)}
            className={inputClass}
            placeholder="firma.de"
          />
          <p className="mt-1 text-xs text-gray-400">Benutzer mit dieser Domain werden per SSO angemeldet.</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoProvision}
              onChange={(e) => setAutoProvision(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="font-medium text-gray-700">Auto-Provisioning</span>
          </label>
          <p className="mt-1 text-xs text-gray-400 ml-6">
            Neue Benutzer automatisch bei erstmaliger SSO-Anmeldung anlegen.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Wird gespeichert..." : config ? "Speichern" : "SSO konfigurieren"}
        </button>
      </form>
    </div>
  );
}
