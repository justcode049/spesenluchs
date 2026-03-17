"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DayAllowance, MealDeduction } from "@/lib/types";
import { useToast } from "@/components/toast";

interface MealDeductionTogglesProps {
  tripId: string;
  allowances: DayAllowance[];
  mealDeductions: MealDeduction[];
}

export function MealDeductionToggles({
  tripId,
  allowances,
  mealDeductions,
}: MealDeductionTogglesProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Build initial state from existing deductions
  const initialState: Record<string, MealDeduction> = {};
  for (const day of allowances) {
    const existing = mealDeductions.find((m) => m.date === day.date);
    initialState[day.date] = existing || {
      date: day.date,
      breakfast: false,
      lunch: false,
      dinner: false,
    };
  }

  const [meals, setMeals] = useState(initialState);
  const [saving, setSaving] = useState(false);

  function toggle(date: string, meal: "breakfast" | "lunch" | "dinner") {
    setMeals((prev) => ({
      ...prev,
      [date]: { ...prev[date], [meal]: !prev[date][meal] },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const deductions = Object.values(meals);

      const { error } = await supabase
        .from("trips")
        .update({
          meal_deductions: deductions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      if (error) throw new Error(error.message);

      showToast("Mahlzeiten gespeichert.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setSaving(false);
  }

  const toggleClass = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-medium transition-colors ${
      active
        ? "bg-red-100 text-red-700 border border-red-300"
        : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
    }`;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Gestellte Mahlzeiten
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Markiere Mahlzeiten, die vom Arbeitgeber gestellt wurden (z.B. Hotelfrühstück).
      </p>
      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {allowances.map((day) => {
          if (day.base_allowance === 0) return null;
          const m = meals[day.date];
          return (
            <div key={day.date} className="flex items-center justify-between p-3">
              <span className="text-sm text-gray-700">
                {new Date(day.date + "T00:00:00").toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggle(day.date, "breakfast")}
                  className={toggleClass(m.breakfast)}
                >
                  F
                </button>
                <button
                  type="button"
                  onClick={() => toggle(day.date, "lunch")}
                  className={toggleClass(m.lunch)}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => toggle(day.date, "dinner")}
                  className={toggleClass(m.dinner)}
                >
                  A
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Mahlzeiten speichern"}
      </button>
    </div>
  );
}
