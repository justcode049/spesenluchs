import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calculatePerDiems } from "@/lib/per-diem";
import { MealDeductionToggles } from "./meal-toggles";
import { TripReceipts } from "./trip-receipts";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!trip) notFound();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
    .eq("trip_id", id)
    .order("date", { ascending: true });

  const { data: unlinkedReceipts } = await supabase
    .from("receipts")
    .select("*")
    .is("trip_id", null)
    .order("date", { ascending: true });

  const { data: mileageEntries } = await supabase
    .from("mileage")
    .select("*")
    .eq("trip_id", id)
    .order("date", { ascending: true });

  const allowances = calculatePerDiems(
    trip.start_datetime,
    trip.end_datetime,
    trip.country,
    trip.meal_deductions || []
  );

  const totalAllowance = allowances.reduce((sum, d) => sum + d.net_allowance, 0);
  const totalReceipts = (receipts || []).reduce(
    (sum, r) => sum + (Number(r.total_amount) || 0), 0
  );
  const totalMileage = (mileageEntries || []).reduce(
    (sum, m) => sum + (Number(m.total_amount) || 0), 0
  );

  const start = new Date(trip.start_datetime);
  const end = new Date(trip.end_datetime);

  return (
    <div>
      <div className="mb-4">
        <Link href="/trips" className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      {/* Trip Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {trip.title || trip.destination}
        </h1>
        <p className="text-sm text-gray-500">
          {start.toLocaleDateString("de-DE")} – {end.toLocaleDateString("de-DE")}
          {" · "}{trip.destination}
          {trip.country !== "DE" && ` (${trip.country})`}
        </p>
        {trip.purpose && (
          <p className="mt-1 text-sm text-gray-400">{trip.purpose}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Pauschalen</p>
          <p className="text-lg font-bold text-gray-900">{totalAllowance.toFixed(2)} €</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Belege</p>
          <p className="text-lg font-bold text-gray-900">{totalReceipts.toFixed(2)} €</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Fahrten</p>
          <p className="text-lg font-bold text-gray-900">{totalMileage.toFixed(2)} €</p>
        </div>
      </div>

      {/* Per Diem Breakdown */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Tagespauschalen (Verpflegungsmehraufwand)
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {allowances.map((day) => (
            <div key={day.date} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(day.date + "T00:00:00").toLocaleDateString("de-DE", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                    {day.is_arrival_departure && (
                      <span className="ml-2 text-xs text-gray-400">
                        (An-/Abreisetag)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {day.hours}h · Pauschale {day.base_allowance.toFixed(2)} EUR
                    {(day.breakfast_deduction > 0 || day.lunch_deduction > 0 || day.dinner_deduction > 0) && (
                      <span className="text-red-500">
                        {day.breakfast_deduction > 0 && ` · F -${day.breakfast_deduction.toFixed(2)}`}
                        {day.lunch_deduction > 0 && ` · M -${day.lunch_deduction.toFixed(2)}`}
                        {day.dinner_deduction > 0 && ` · A -${day.dinner_deduction.toFixed(2)}`}
                      </span>
                    )}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${day.net_allowance > 0 ? "text-green-700" : "text-gray-400"}`}>
                  {day.net_allowance.toFixed(2)} EUR
                </p>
              </div>
            </div>
          ))}
          <div className="p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Gesamt</p>
              <p className="text-sm font-bold text-gray-900">{totalAllowance.toFixed(2)} EUR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Deductions */}
      <MealDeductionToggles
        tripId={trip.id}
        allowances={allowances}
        mealDeductions={trip.meal_deductions || []}
      />

      {/* Mileage */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Fahrten ({(mileageEntries || []).length})
          </h2>
          <Link
            href={`/mileage/new?trip=${id}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-500"
          >
            + Fahrt erfassen
          </Link>
        </div>
        {(!mileageEntries || mileageEntries.length === 0) ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
            <p className="text-xs text-gray-400">Noch keine Fahrten erfasst.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {mileageEntries.map((m) => {
              const effectiveKm = m.is_round_trip
                ? Number(m.distance_km) * 2
                : Number(m.distance_km);
              return (
                <div key={m.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.start_location} → {m.end_location}
                      {m.is_round_trip && <span className="ml-1 text-xs text-gray-400">(H+R)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(m.date).toLocaleDateString("de-DE")} · {effectiveKm.toFixed(1)} km
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(m.total_amount).toFixed(2)} €
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Linked Receipts */}
      <TripReceipts
        tripId={trip.id}
        linkedReceipts={receipts || []}
        unlinkedReceipts={unlinkedReceipts || []}
      />
    </div>
  );
}
