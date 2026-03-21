"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

export default function CostCenterImportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvContent, setCsvContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

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

      if (org) setOrgId(org.id);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvContent(text);
  }

  async function handleImport() {
    if (!orgId || !csvContent) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/cost-centers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId, csv_content: csvContent }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      setResult(json);
      if (json.imported > 0) {
        showToast(`${json.imported} von ${json.total} Kostenstellen importiert!`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import fehlgeschlagen", "error");
    }
    setImporting(false);
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
      <div className="mb-4">
        <Link href={`/org/${slug}/cost-centers`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Kostenstellen importieren</h1>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600 mb-4">
          CSV-Datei mit Semikolon als Trennzeichen. Pflichtfelder: <strong>Nummer</strong>, <strong>Name</strong>.
          Optional: Kostenträger, Gültig_ab, Gültig_bis.
        </p>
        <pre className="mb-4 rounded bg-gray-50 p-3 text-xs text-gray-600">
          Nummer;Name;Kostenträger;Gültig_ab;Gültig_bis{"\n"}
          4711;Vertrieb;KT001;2024-01-01;{"\n"}
          4712;Marketing;KT001;;{"\n"}
          4713;Entwicklung;KT002;;
        </pre>

        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />

        {csvContent && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Vorschau:</p>
            <pre className="rounded bg-gray-50 p-3 text-xs text-gray-600 max-h-40 overflow-auto">
              {csvContent.split("\n").slice(0, 10).join("\n")}
              {csvContent.split("\n").length > 10 && "\n..."}
            </pre>
          </div>
        )}
      </div>

      <button
        onClick={handleImport}
        disabled={importing || !csvContent}
        className="rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {importing ? "Wird importiert..." : "Importieren"}
      </button>

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">
            {result.imported} von {result.total} importiert
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}
          <button
            onClick={() => router.push(`/org/${slug}/cost-centers`)}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Zur Kostenstellen-Liste
          </button>
        </div>
      )}
    </div>
  );
}
