"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

export default function NewOrgPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Organisation erstellt!");
      router.push(`/org/${data.organization.slug}/settings`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Organisation erstellen</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="z.B. Meine Firma GmbH"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Wird erstellt..." : "Organisation erstellen"}
        </button>
      </form>
    </div>
  );
}
