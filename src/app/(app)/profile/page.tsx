"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { VEHICLE_LABELS, VehicleType } from "@/lib/types";
import { useOrg } from "@/lib/org-context";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { memberships, switchOrg, org } = useOrg();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [employer, setEmployer] = useState("");
  const [primaryWorkplace, setPrimaryWorkplace] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [employmentType, setEmploymentType] = useState("employee");
  const [taxId, setTaxId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [defaultCostCenter, setDefaultCostCenter] = useState("");

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setCity(profile.city || "");
        setEmployer(profile.employer || "");
        setPrimaryWorkplace(profile.primary_workplace || "");
        setVehicleType(profile.vehicle_type || "car");
        setEmploymentType(profile.employment_type || "employee");
        setTaxId(profile.tax_id || "");
        setLicensePlate(profile.license_plate || "");
        setDefaultCostCenter(profile.default_cost_center || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        city,
        employer,
        primary_workplace: primaryWorkplace,
        vehicle_type: vehicleType,
        employment_type: employmentType,
        tax_id: taxId || null,
        license_plate: licensePlate || null,
        default_cost_center: defaultCostCenter || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      showToast("Fehler beim Speichern.", "error");
    } else {
      showToast("Profil gespeichert.");
    }
    setSaving(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Profil</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Persönliche Daten */}
        <h2 className="text-sm font-semibold text-gray-700">Persönliche Daten</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Wohnort (Stadt)</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="z.B. Hamburg" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Beschäftigungsart</label>
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputClass}>
            <option value="employee">Angestellte/r</option>
            <option value="freelancer">Selbstständig / Freiberufler</option>
          </select>
        </div>

        {/* Arbeitgeber / Geschäft */}
        <h2 className="mt-6 text-sm font-semibold text-gray-700">
          {employmentType === "employee" ? "Arbeitgeber" : "Geschäftsdaten"}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {employmentType === "employee" ? "Arbeitgeber" : "Firmenname"}
          </label>
          <input type="text" value={employer} onChange={(e) => setEmployer(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Erste Tätigkeitsstätte</label>
          <input type="text" value={primaryWorkplace} onChange={(e) => setPrimaryWorkplace(e.target.value)} className={inputClass} placeholder="z.B. Hamburg, Büro Hauptstraße 1" />
          <p className="mt-1 text-xs text-gray-400">Für die Unterscheidung Dienstreise vs. Entfernungspauschale</p>
        </div>

        {employmentType === "freelancer" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">USt-ID</label>
            <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputClass} placeholder="DE123456789" />
          </div>
        )}

        {/* Fahrzeug */}
        <h2 className="mt-6 text-sm font-semibold text-gray-700">Fahrzeug</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fahrzeugtyp</label>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} className={inputClass}>
            {(Object.entries(VEHICLE_LABELS) as [VehicleType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Kennzeichen</label>
          <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className={inputClass} placeholder="HH-AB 1234" />
        </div>

        {/* Sonstiges */}
        <h2 className="mt-6 text-sm font-semibold text-gray-700">Sonstiges</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Standard-Kostenstelle</label>
          <input type="text" value={defaultCostCenter} onChange={(e) => setDefaultCostCenter(e.target.value)} className={inputClass} placeholder="z.B. 4200 Reisekosten" />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Profil speichern"}
        </button>
      </form>

      {/* Organisationen */}
      <h2 className="mt-8 text-sm font-semibold text-gray-700">Organisationen</h2>

      {memberships.length > 0 ? (
        <div className="mt-3 space-y-2">
          {memberships.map((m) => (
            <div
              key={m.organization.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                org?.id === m.organization.id
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{m.organization.name}</p>
                <p className="text-xs text-gray-500">{m.role}</p>
              </div>
              <div className="flex gap-2">
                {org?.id === m.organization.id ? (
                  <button
                    onClick={() => switchOrg(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Deaktivieren
                  </button>
                ) : (
                  <button
                    onClick={() => switchOrg(m.organization.id)}
                    className="text-xs text-blue-600 hover:text-blue-500"
                  >
                    Aktivieren
                  </button>
                )}
                <Link
                  href={`/org/${m.organization.slug}/settings`}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Verwalten
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-500">Du bist noch keiner Organisation zugeordnet.</p>
      )}

      <Link
        href="/org/new"
        className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
      >
        + Organisation erstellen
      </Link>

      {/* DSGVO */}
      <h2 className="mt-8 text-sm font-semibold text-gray-700">Datenschutz (DSGVO)</h2>

      <div className="mt-3 flex gap-3">
        <a
          href="/api/account/export"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Daten exportieren
        </a>
        <button
          onClick={async () => {
            if (!confirm("Alle Daten unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
            const res = await fetch("/api/account/delete", { method: "POST" });
            if (res.ok) {
              router.push("/login");
            } else {
              showToast("Fehler beim Löschen", "error");
            }
          }}
          className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Account löschen
        </button>
      </div>

      <hr className="my-8 border-gray-200" />

      <button
        onClick={handleLogout}
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Abmelden
      </button>
    </div>
  );
}
