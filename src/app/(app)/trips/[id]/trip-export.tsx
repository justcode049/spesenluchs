"use client";

import { useState, useEffect } from "react";
import { DayAllowance } from "@/lib/types";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";

interface TripExportProps {
  tripId: string;
  trip: {
    title: string | null;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    organization_id: string | null;
  };
  userName: string;
  allowances: DayAllowance[];
  receipts: Array<{
    date: string | null;
    vendor_name: string | null;
    total_amount: number | null;
    currency: string;
    receipt_type: string;
    vendor_city: string | null;
  }>;
  mileage: Array<{
    date: string;
    start_location: string;
    end_location: string;
    distance_km: number;
    is_round_trip: boolean;
    vehicle_type: string;
    rate_per_km: number;
    total_amount: number;
  }>;
}

export function TripExport({
  tripId,
  trip,
  userName,
  allowances,
  receipts,
  mileage,
}: TripExportProps) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportingDatev, setExportingDatev] = useState(false);
  const [enabledErpTypes, setEnabledErpTypes] = useState<string[]>([]);
  const [exportingSap, setExportingSap] = useState(false);
  const [exportingEnventa, setExportingEnventa] = useState(false);

  // Load enabled ERP integrations for this org
  useEffect(() => {
    if (!trip.organization_id) return;
    async function loadErpConfigs() {
      const supabase = createClient();
      const { data } = await supabase
        .from("erp_configs")
        .select("erp_type")
        .eq("organization_id", trip.organization_id!)
        .eq("enabled", true);
      if (data) setEnabledErpTypes(data.map((c) => c.erp_type));
    }
    loadErpConfigs();
  }, [trip.organization_id]);

  const exportData = {
    title: trip.title || trip.destination,
    destination: trip.destination,
    startDate: trip.start_datetime.split("T")[0],
    endDate: trip.end_datetime.split("T")[0],
    userName,
    allowances,
    receipts,
    mileage,
  };

  async function handlePdfExport() {
    setExporting(true);
    try {
      const { generatePDF } = await import("@/lib/export-pdf");
      const doc = generatePDF(exportData);
      const fileName = `Reisekosten_${exportData.title.replace(/\s+/g, "_")}_${exportData.startDate}.pdf`;
      doc.save(fileName);
      showToast("PDF exportiert!");
    } catch (err) {
      console.error(err);
      showToast("PDF-Export fehlgeschlagen.", "error");
    }
    setExporting(false);
  }

  function handleCsvExport() {
    try {
      const { generateCSV } = require("@/lib/export-csv");
      const csv = generateCSV(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reisekosten_${exportData.title.replace(/\s+/g, "_")}_${exportData.startDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV exportiert!");
    } catch (err) {
      console.error(err);
      showToast("CSV-Export fehlgeschlagen.", "error");
    }
  }

  async function handleDatevExport() {
    setExportingDatev(true);
    try {
      const res = await fetch("/api/export/datev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Export fehlgeschlagen");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || `DATEV_Export.zip`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast("DATEV-Export erstellt!");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "DATEV-Export fehlgeschlagen.", "error");
    }
    setExportingDatev(false);
  }

  async function handleSapExport() {
    setExportingSap(true);
    try {
      // SAP export is via API v1 – needs API key. For UI, we use a dedicated server route.
      const res = await fetch("/api/export/sap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "SAP-Export fehlgeschlagen");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAP_IDoc_${tripId}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("SAP-Export erstellt!");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "SAP-Export fehlgeschlagen.", "error");
    }
    setExportingSap(false);
  }

  async function handleEnventaExport() {
    setExportingEnventa(true);
    try {
      const res = await fetch("/api/export/enventa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "enventa-Export fehlgeschlagen");
      }

      showToast("An enventa übermittelt!");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "enventa-Export fehlgeschlagen.", "error");
    }
    setExportingEnventa(false);
  }

  const showSap = enabledErpTypes.includes("sap");
  const showEnventa = enabledErpTypes.includes("enventa");

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Export</h2>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handlePdfExport}
          disabled={exporting}
          className="flex-1 min-w-[100px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? "Wird erstellt..." : "PDF Export"}
        </button>
        <button
          onClick={handleCsvExport}
          className="flex-1 min-w-[100px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          CSV Export
        </button>
        <button
          onClick={handleDatevExport}
          disabled={exportingDatev}
          className="flex-1 min-w-[100px] rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {exportingDatev ? "Wird erstellt..." : "DATEV Export"}
        </button>
        {showSap && (
          <button
            onClick={handleSapExport}
            disabled={exportingSap}
            className="flex-1 min-w-[100px] rounded-md border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            {exportingSap ? "Wird erstellt..." : "SAP Export"}
          </button>
        )}
        {showEnventa && (
          <button
            onClick={handleEnventaExport}
            disabled={exportingEnventa}
            className="flex-1 min-w-[100px] rounded-md border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
          >
            {exportingEnventa ? "Wird gesendet..." : "enventa Push"}
          </button>
        )}
      </div>
    </div>
  );
}
