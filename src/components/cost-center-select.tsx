"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CostCenter } from "@/lib/types";
import { formatCostCenter } from "@/lib/cost-center-utils";

interface CostCenterSelectProps {
  organizationId: string | null;
  value: string | null;
  onChange: (costCenterId: string | null) => void;
  required?: boolean;
  disabled?: boolean;
}

export function CostCenterSelect({
  organizationId,
  value,
  onChange,
  required = false,
  disabled = false,
}: CostCenterSelectProps) {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setCostCenters([]);
      return;
    }

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("number");
      setCostCenters(data || []);
      setLoading(false);
    }
    load();
  }, [organizationId]);

  if (!organizationId || costCenters.length === 0) return null;

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Kostenstelle {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputClass}
        required={required}
        disabled={disabled || loading}
      >
        <option value="">– Keine Kostenstelle –</option>
        {costCenters.map((cc) => (
          <option key={cc.id} value={cc.id}>
            {formatCostCenter(cc)}
          </option>
        ))}
      </select>
    </div>
  );
}
