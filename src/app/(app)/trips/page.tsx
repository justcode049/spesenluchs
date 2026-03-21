import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripListClient } from "./trip-list-client";

export default async function TripsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("start_datetime", { ascending: false });

  // Load cost centers for filter (from all orgs user is member of)
  let costCenters: Array<{ id: string; number: string; name: string }> = [];
  if (user) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const orgIds = memberships.map((m) => m.organization_id);
      const { data: cc } = await supabase
        .from("cost_centers")
        .select("id, number, name")
        .in("organization_id", orgIds)
        .eq("active", true)
        .order("number");
      costCenters = cc || [];
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Meine Reisen</h1>
        <Link
          href="/trips/new"
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 min-h-[44px] flex items-center"
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
        <TripListClient trips={trips} costCenters={costCenters} />
      )}
    </div>
  );
}
