import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCostCenterCsv } from "@/lib/cost-center-utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json();
    const { organization_id, csv_content } = body;

    if (!organization_id || !csv_content) {
      return NextResponse.json({ error: "organization_id und csv_content sind Pflichtfelder" }, { status: 400 });
    }

    // Parse CSV
    const { rows, errors } = parseCostCenterCsv(csv_content);
    if (errors.length > 0) {
      return NextResponse.json({ error: "CSV-Fehler", details: errors }, { status: 400 });
    }

    // Resolve cost object numbers to IDs
    const { data: costObjects } = await supabase
      .from("cost_objects")
      .select("id, number")
      .eq("organization_id", organization_id);

    const coMap = new Map((costObjects || []).map((co) => [co.number, co.id]));

    // Insert cost centers
    let imported = 0;
    const importErrors: string[] = [];

    for (const row of rows) {
      const insert: Record<string, unknown> = {
        organization_id,
        number: row.number,
        name: row.name,
        valid_from: row.valid_from || null,
        valid_to: row.valid_to || null,
      };

      if (row.cost_object_number) {
        const coId = coMap.get(row.cost_object_number);
        if (coId) {
          insert.cost_object_id = coId;
        } else {
          importErrors.push(`Kostenträger "${row.cost_object_number}" nicht gefunden für Kostenstelle ${row.number}.`);
        }
      }

      const { error } = await supabase.from("cost_centers").insert(insert);
      if (error) {
        if (error.code === "23505") {
          importErrors.push(`Kostenstelle ${row.number} existiert bereits – übersprungen.`);
        } else {
          importErrors.push(`Fehler bei ${row.number}: ${error.message}`);
        }
      } else {
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      total: rows.length,
      errors: importErrors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import fehlgeschlagen" },
      { status: 500 }
    );
  }
}
