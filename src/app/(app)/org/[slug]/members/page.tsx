"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import type { OrgRole } from "@/lib/types";

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  profile: { display_name: string | null } | null;
  email?: string;
}

interface InvitationRow {
  id: string;
  email: string;
  role: OrgRole;
  accepted_at: string | null;
  expires_at: string;
}

export default function OrgMembersPage() {
  const params = useParams();
  const { showToast } = useToast();
  const slug = params.slug as string;

  const [orgId, setOrgId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("employee");
  const [inviting, setInviting] = useState(false);

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

      const { data: memberData } = await supabase
        .from("memberships")
        .select("id, user_id, role")
        .eq("organization_id", org.id);

      // Load profiles separately (no FK from memberships to profiles)
      const userIds = (memberData || []).map((m) => m.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));

      const myMembership = (memberData || []).find((m) => m.user_id === user.id);
      setMyRole((myMembership?.role as OrgRole) || null);
      setMembers((memberData || []).map((m) => ({
        ...m,
        profile: { display_name: profileMap.get(m.user_id) || null },
      })));

      const { data: invData } = await supabase
        .from("invitations")
        .select("id, email, role, accepted_at, expires_at")
        .eq("organization_id", org.id)
        .is("accepted_at", null);

      setInvitations((invData || []) as InvitationRow[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !inviteEmail) return;

    setInviting(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Einladung verschickt!");
      setInviteEmail("");
      setInvitations((prev) => [...prev, data.invitation]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fehler", "error");
    }
    setInviting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  const canInvite = myRole === "admin" || myRole === "manager";
  const roleLabels: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    employee: "Mitarbeiter",
  };

  return (
    <div>
      <div className="mb-4">
        <Link href={`/org/${slug}/settings`} className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Zurück
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Mitglieder</h1>

      {/* Member list */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {(m.profile as { display_name: string | null } | null)?.display_name || "Unbenannt"}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {roleLabels[m.role] || m.role}
            </span>
          </div>
        ))}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Offene Einladungen</h2>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3">
                <p className="text-sm text-gray-600">{inv.email}</p>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  {roleLabels[inv.role]} (ausstehend)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canInvite && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Mitglied einladen</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className={inputClass}
                placeholder="email@beispiel.de"
              />
            </div>
            <div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                className={inputClass}
              >
                <option value="employee">Mitarbeiter</option>
                <option value="manager">Manager</option>
                {myRole === "admin" && <option value="admin">Admin</option>}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? "Wird eingeladen..." : "Einladen"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
