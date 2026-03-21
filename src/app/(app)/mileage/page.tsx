import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MileagePage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("mileage")
    .select("*")
    .order("date", { ascending: false });

  const total = (entries || []).reduce(
    (sum, e) => sum + (Number(e.total_amount) || 0), 0
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Fahrten</h1>
        <Link
          href="/mileage/new"
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 min-h-[44px] flex items-center"
        >
          + Fahrt erfassen
        </Link>
      </div>

      {!entries || entries.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine Fahrten erfasst.</p>
          <Link
            href="/mileage/new"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Erste Fahrt erfassen
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Gesamt Fahrtkostenerstattung</p>
            <p className="text-lg font-bold text-gray-900">{total.toFixed(2)} EUR</p>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => {
              const effectiveKm = entry.is_round_trip
                ? Number(entry.distance_km) * 2
                : Number(entry.distance_km);

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {entry.start_location} → {entry.end_location}
                        {entry.is_round_trip && (
                          <span className="ml-1 text-xs text-gray-400">(H+R)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString("de-DE")}
                        {" · "}{effectiveKm.toFixed(1)} km
                        {" · "}{entry.vehicle_type === "car" ? "PKW" : entry.vehicle_type === "motorcycle" ? "Motorrad" : "E-Bike"}
                        {entry.notes && ` · ${entry.notes}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {Number(entry.total_amount).toFixed(2)} EUR
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
