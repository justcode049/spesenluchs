"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, OrgRole } from "@/lib/types";

interface OrgContextValue {
  org: Organization | null;
  role: OrgRole | null;
  memberships: { organization: Organization; role: OrgRole }[];
  switchOrg: (orgId: string | null) => void;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  role: null,
  memberships: [],
  switchOrg: () => {},
  loading: true,
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [memberships, setMemberships] = useState<
    { organization: Organization; role: OrgRole }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMemberships() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("memberships")
        .select("role, organization:organizations(*)")
        .eq("user_id", user.id);

      if (data && data.length > 0) {
        const parsed = data.map((m) => ({
          organization: m.organization as unknown as Organization,
          role: m.role as OrgRole,
        }));
        setMemberships(parsed);

        // Restore last selected org from localStorage
        const savedOrgId = localStorage.getItem("spesenluchs_org");
        const saved = parsed.find((m) => m.organization.id === savedOrgId);
        if (saved) {
          setOrg(saved.organization);
          setRole(saved.role);
        }
      }

      setLoading(false);
    }
    loadMemberships();
  }, []);

  const switchOrg = useCallback(
    (orgId: string | null) => {
      if (!orgId) {
        setOrg(null);
        setRole(null);
        localStorage.removeItem("spesenluchs_org");
        return;
      }
      const match = memberships.find((m) => m.organization.id === orgId);
      if (match) {
        setOrg(match.organization);
        setRole(match.role);
        localStorage.setItem("spesenluchs_org", orgId);
      }
    },
    [memberships]
  );

  return (
    <OrgContext.Provider value={{ org, role, memberships, switchOrg, loading }}>
      {children}
    </OrgContext.Provider>
  );
}
