import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function OrgAuditPage({
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

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") notFound();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const actionLabels: Record<string, string> = {
    create: "Erstellt",
    update: "Bearbeitet",
    delete: "Gelöscht",
    submit: "Eingereicht",
    approve: "Genehmigt",
    reject: "Abgelehnt",
    confirm: "Bestätigt",
  };

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Audit-Log: {org.name}</h1>

      {!entries || entries.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Keine Audit-Einträge.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {entries.map((entry) => (
            <div key={entry.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {actionLabels[entry.action] || entry.action}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {entry.entity_type}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleString("de-DE")}
                </span>
              </div>
              {entry.changes && (
                <pre className="mt-1 text-xs text-gray-500 overflow-auto max-h-20">
                  {JSON.stringify(entry.changes, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
