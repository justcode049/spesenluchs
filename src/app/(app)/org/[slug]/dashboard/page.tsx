import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!org) notFound();

  // Fetch all trips in this org
  const { data: trips } = await supabase
    .from("trips")
    .select("*, profile:profiles(display_name)")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, string> = {
    draft: "Entwurf",
    submitted: "Eingereicht",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
    confirmed: "Bestätigt",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    confirmed: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Team-Dashboard: {org.name}</h1>

      {!trips || trips.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine Reisen im Team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
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
                    {(trip.profile as { display_name: string | null } | null)?.display_name || "Unbekannt"}
                    {" · "}
                    {new Date(trip.start_datetime).toLocaleDateString("de-DE")} –{" "}
                    {new Date(trip.end_datetime).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[trip.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {statusLabels[trip.status] || trip.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
