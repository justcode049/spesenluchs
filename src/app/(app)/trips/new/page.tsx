"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { getSupportedCountries } from "@/lib/per-diem";

const countries = getSupportedCountries();

export default function NewTripPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("DE");
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("18:00");

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!destination || !startDate || !endDate) return;

    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const startDatetime = `${startDate}T${startTime}:00`;
      const endDatetime = `${endDate}T${endTime}:00`;

      if (new Date(endDatetime) <= new Date(startDatetime)) {
        showToast("Enddatum muss nach Startdatum liegen.", "error");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: title || null,
          destination,
          country,
          purpose: purpose || null,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          meal_deductions: [],
          status: "draft",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      showToast("Reise angelegt!");
      router.push(`/trips/${data.id}`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Neue Reise</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Titel <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="z.B. Kundentermin München"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reiseziel <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={inputClass}
            placeholder="z.B. München"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Land</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Zweck</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className={inputClass}
            placeholder="z.B. Kundentermin, Messe, Schulung"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Startdatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate) setEndDate(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Uhrzeit</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Enddatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Uhrzeit</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Wird angelegt..." : "Reise anlegen"}
        </button>
      </form>
    </div>
  );
}
