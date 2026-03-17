import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Meine Belege</h1>
        <div className="flex gap-2">
          <Link
            href="/receipts/batch"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batch
          </Link>
          <Link
            href="/receipts/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Beleg
          </Link>
        </div>
      </div>

      {!receipts || receipts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Noch keine Belege erfasst.</p>
          <Link
            href="/receipts/new"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Ersten Beleg erfassen
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/receipts/${receipt.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {receipt.vendor_name || "Unbekannter Händler"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {receipt.date
                      ? new Date(receipt.date).toLocaleDateString("de-DE")
                      : "Kein Datum"}
                    {receipt.vendor_city && ` · ${receipt.vendor_city}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {receipt.total_amount != null
                      ? `${Number(receipt.total_amount).toFixed(2)} ${receipt.currency || "EUR"}`
                      : "–"}
                  </p>
                  <span className="inline-block mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {receipt.receipt_type || "sonstiges"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
