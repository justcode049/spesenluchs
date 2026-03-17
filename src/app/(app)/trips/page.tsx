import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("start_datetime", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Meine Reisen</h1>
        <Link
          href="/trips/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Neue Reise
        </Link>
      </div>

      {!trips || trips.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine Reisen angelegt.</p>
          <Link
            href="/trips/new"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Erste Reise anlegen
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const start = new Date(trip.start_datetime);
            const end = new Date(trip.end_datetime);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            return (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {trip.title || trip.destination}
                    </p>
                    <p className="text-sm text-gray-500">
                      {start.toLocaleDateString("de-DE")} – {end.toLocaleDateString("de-DE")}
                      {" · "}{days} {days === 1 ? "Tag" : "Tage"}
                    </p>
                    {trip.purpose && (
                      <p className="mt-1 text-xs text-gray-400">{trip.purpose}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    trip.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {trip.status === "confirmed" ? "Abgeschlossen" : "Entwurf"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
