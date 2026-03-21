"use client";

import { useState } from "react";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  confirmed: "Bestätigt",
  submitted: "Eingereicht",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  submitted: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

interface TripListClientProps {
  trips: Array<{
    id: string;
    title: string | null;
    destination: string;
    purpose: string | null;
    start_datetime: string;
    end_datetime: string;
    status: string;
    cost_center_id: string | null;
  }>;
  costCenters: Array<{ id: string; number: string; name: string }>;
}

export function TripListClient({ trips, costCenters }: TripListClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [costCenterFilter, setCostCenterFilter] = useState<string>("");

  const selectClass =
    "rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const filtered = trips.filter((trip) => {
    if (statusFilter && trip.status !== statusFilter) return false;
    if (costCenterFilter && trip.cost_center_id !== costCenterFilter) return false;
    return true;
  });

  const hasFilters = costCenters.length > 0;

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="submitted">Eingereicht</option>
          <option value="approved">Genehmigt</option>
          <option value="rejected">Abgelehnt</option>
          <option value="confirmed">Bestätigt</option>
        </select>

        {hasFilters && (
          <select
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">Alle Kostenstellen</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.number} – {cc.name}
              </option>
            ))}
          </select>
        )}

        {(statusFilter || costCenterFilter) && (
          <button
            onClick={() => { setStatusFilter(""); setCostCenterFilter(""); }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Keine Reisen für diesen Filter.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((trip) => {
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
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[trip.status] || "bg-gray-100 text-gray-600"
                  }`}>
                    {statusLabels[trip.status] || trip.status}
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
