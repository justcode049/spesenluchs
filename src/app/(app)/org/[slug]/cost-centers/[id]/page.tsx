"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CostCenter, OrgRole } from "@/lib/types";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveStatusIndicator } from "@/components/save-status";
import { useToast } from "@/components/toast";

interface UserAssignment {
  id: string;
  user_id: string;
  is_default: boolean;
  display_name: string | null;
  email: string;
}

export default function CostCenterDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const ccId = params.id as string;
  const { showToast } = useToast();

  const [cc, setCc] = useState<CostCenter | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserAssignment[]>([]);
  const [orgMembers, setOrgMembers] = useState<Array<{ user_id: string; display_name: string | null; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

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
      if (!org) return;

      setOrgId(org.id);

      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("organization_id", org.id)
        .eq("user_id", user.id)
        .single();
      setRole((membership?.role as OrgRole) || null);

      // Load cost center
      const { data: ccData } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("id", ccId)
        .single();

      if (ccData) {
        setCc(ccData);
        setName(ccData.name);
        setNumber(ccData.number);
      }

      // Load user assignments
      const { data: assignments } = await supabase
        .from("user_cost_centers")
        .select("id, user_id, is_default")
        .eq("cost_center_id", ccId);

      if (assignments && assignments.length > 0) {
        const userIds = assignments.map((a) => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));
        setUsers(
          assignments.map((a) => ({
            ...a,
            display_name: profileMap.get(a.user_id) || null,
            email: "",
          }))
        );
      }

      // Load org members for assignment dropdown
      const { data: members } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("organization_id", org.id);

      if (members) {
        const memberIds = members.map((m) => m.user_id);
        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", memberIds);

        setOrgMembers(
          (memberProfiles || []).map((p) => ({
            user_id: p.id,
            display_name: p.display_name,
            email: "",
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, [slug, ccId]);

  const saveFn = useCallback(async () => {
    if (!cc || role !== "admin") return;
    const res = await fetch(`/api/cost-centers/${cc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number }),
    });
    if (!res.ok) throw new Error("Fehler beim Speichern");
  }, [cc, role, name, number]);

  const saveStatus = useAutoSave(loading ? null : `${name}|${number}`, saveFn, 800);

  async function handleAssignUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("user_cost_centers")
      .insert({ user_id: selectedUserId, cost_center_id: ccId });

    if (error) {
      showToast(error.code === "23505" ? "Benutzer bereits zugeordnet" : error.message, "error");
      return;
    }

    const member = orgMembers.find((m) => m.user_id === selectedUserId);
    setUsers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user_id: selectedUserId,
        is_default: false,
        display_name: member?.display_name || null,
        email: "",
      },
    ]);
    setSelectedUserId("");
    showToast("Benutzer zugeordnet!");
  }

  async function handleRemoveUser(userId: string) {
    const supabase = createClient();
    await supabase
      .from("user_cost_centers")
      .delete()
      .eq("user_id", userId)
      .eq("cost_center_id", ccId);

    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    showToast("Zuordnung entfernt.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!cc) return null;
  const isAdmin = role === "admin";
  const assignedUserIds = new Set(users.map((u) => u.user_id));

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/cost-centers`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Kostenstelle bearbeiten</h1>

      <div className="space-y-4 mb-8">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Nummer</label>
            {isAdmin && <SaveStatusIndicator status={saveStatus} />}
          </div>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={inputClass}
            disabled={!isAdmin}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            disabled={!isAdmin}
          />
        </div>
      </div>

      {/* User Assignments */}
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Zugeordnete Benutzer</h2>

      {isAdmin && (
        <form onSubmit={handleAssignUser} className="mb-4 flex gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className={inputClass + " flex-1"}
          >
            <option value="">Benutzer auswählen...</option>
            {orgMembers
              .filter((m) => !assignedUserIds.has(m.user_id))
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name || m.user_id}
                </option>
              ))}
          </select>
          <button
            type="submit"
            disabled={!selectedUserId}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Zuordnen
          </button>
        </form>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">Keine Benutzer zugeordnet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-900">{u.display_name || u.user_id}</p>
              {isAdmin && (
                <button
                  onClick={() => handleRemoveUser(u.user_id)}
                  className="text-xs text-red-600 hover:text-red-500"
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
