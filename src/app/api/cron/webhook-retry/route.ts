import { NextRequest, NextResponse } from "next/server";
import { retryFailedDeliveries } from "@/lib/webhooks";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const retried = await retryFailedDeliveries();
    return NextResponse.json({ success: true, retried });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retry failed" },
      { status: 500 }
    );
  }
}
