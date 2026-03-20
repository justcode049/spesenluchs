"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = params.id as string;

  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: invitation } = await supabase
        .from("invitations")
        .select("*, organization:organizations(name)")
        .eq("id", id)
        .single();

      if (!invitation) {
        setError("Einladung nicht gefunden");
        setLoading(false);
        return;
      }

      if (invitation.accepted_at) {
        setError("Einladung wurde bereits angenommen");
        setLoading(false);
        return;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        setError("Einladung ist abgelaufen");
        setLoading(false);
        return;
      }

      setOrgName((invitation.organization as { name: string })?.name || "");
      setRole(invitation.role);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invitations/${id}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Einladung angenommen!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    employee: "Mitarbeiter",
  };

  return (
    <div className="py-12 text-center">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Einladung</h1>
      <p className="mb-2 text-sm text-gray-600">
        Du wurdest eingeladen, <span className="font-semibold">{orgName}</span> beizutreten.
      </p>
      <p className="mb-6 text-sm text-gray-500">
        Rolle: {roleLabels[role] || role}
      </p>
      <button
        onClick={handleAccept}
        disabled={accepting}
        className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {accepting ? "Wird angenommen..." : "Einladung annehmen"}
      </button>
    </div>
  );
}
