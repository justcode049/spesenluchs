import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReceiptImage } from "./receipt-image";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (!receipt) {
    notFound();
  }

  const receiptTypeLabels: Record<string, string> = {
    hotel: "Hotel",
    restaurant: "Restaurant",
    taxi: "Taxi",
    public_transport: "ÖPNV",
    gas_station: "Tankstelle",
    parking: "Parken",
    train: "Bahn",
    flight: "Flug",
    other: "Sonstiges",
  };

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          &larr; Zurück
        </Link>
      </div>

      <div className="space-y-6">
        <ReceiptImage imagePath={receipt.image_path} />

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {receipt.vendor_name || "Unbekannter Händler"}
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {receiptTypeLabels[receipt.receipt_type] || receipt.receipt_type}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Datum</span>
              <p className="font-medium text-gray-900">
                {receipt.date
                  ? new Date(receipt.date).toLocaleDateString("de-DE")
                  : "–"}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Betrag</span>
              <p className="font-medium text-gray-900">
                {receipt.total_amount != null
                  ? `${Number(receipt.total_amount).toFixed(2)} ${receipt.currency || "EUR"}`
                  : "–"}
              </p>
            </div>
            {receipt.vendor_city && (
              <div>
                <span className="text-gray-500">Stadt</span>
                <p className="font-medium text-gray-900">{receipt.vendor_city}</p>
              </div>
            )}
          </div>

          {receipt.vat_positions &&
            Array.isArray(receipt.vat_positions) &&
            receipt.vat_positions.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">MwSt</span>
                <div className="mt-1 space-y-1">
                  {receipt.vat_positions.map(
                    (
                      vat: { rate: number; net: number; vat: number; gross: number },
                      i: number
                    ) => (
                      <p key={i} className="text-sm text-gray-700">
                        {(vat.rate * 100).toFixed(0)}%: {vat.net.toFixed(2)} netto
                        + {vat.vat.toFixed(2)} MwSt = {vat.gross.toFixed(2)}{" "}
                        {receipt.currency || "EUR"}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
