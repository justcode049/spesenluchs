"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { VehicleType, VEHICLE_RATES, VEHICLE_LABELS } from "@/lib/types";

export default function NewMileagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [notes, setNotes] = useState("");

  const rate = VEHICLE_RATES[vehicleType];
  const distance = parseFloat(distanceKm) || 0;
  const effectiveDistance = isRoundTrip ? distance * 2 : distance;
  const totalAmount = effectiveDistance * rate;

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startLocation || !endLocation || !distanceKm) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase.from("mileage").insert({
        user_id: user.id,
        trip_id: tripId || null,
        date,
        start_location: startLocation,
        end_location: endLocation,
        distance_km: parseFloat(distanceKm),
        is_round_trip: isRoundTrip,
        vehicle_type: vehicleType,
        rate_per_km: rate,
        notes: notes || null,
      });

      if (error) throw new Error(error.message);

      showToast("Fahrt gespeichert!");
      if (tripId) {
        router.push(`/trips/${tripId}`);
      } else {
        router.push("/mileage");
      }
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Fahrt erfassen</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Datum <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Startort <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            className={inputClass}
            placeholder="z.B. Hamburg, Büro"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Zielort <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
            className={inputClass}
            placeholder="z.B. München, Kunde XY"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Entfernung (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              required
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className={inputClass}
              placeholder="z.B. 320"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hin- und Rückfahrt</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fahrzeug</label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            className={inputClass}
          >
            {(Object.entries(VEHICLE_LABELS) as [VehicleType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>{label}</option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Anmerkung <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="z.B. Kundentermin"
          />
        </div>

        {/* Live Preview */}
        {distance > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {effectiveDistance.toFixed(1)} km × {rate.toFixed(2)} €/km
              </span>
              <span className="font-bold text-gray-900">
                {totalAmount.toFixed(2)} EUR
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Wird gespeichert..." : "Fahrt speichern"}
        </button>
      </form>
    </div>
  );
}
