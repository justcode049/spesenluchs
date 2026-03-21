import { createClient } from "@/lib/supabase/server";

export async function CostCenterBadge({ costCenterId }: { costCenterId: string }) {
  const supabase = await createClient();
  const { data: cc } = await supabase
    .from("cost_centers")
    .select("number, name")
    .eq("id", costCenterId)
    .single();

  if (!cc) return null;

  return (
    <p className="mt-1 text-xs text-gray-500">
      Kostenstelle: <span className="font-medium">{cc.number} – {cc.name}</span>
    </p>
  );
}
