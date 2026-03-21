import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export type WebhookEvent =
  | "trip.submitted"
  | "trip.approved"
  | "trip.rejected"
  | "trip.exported";

const RETRY_DELAYS = [60, 300, 1800]; // 1min, 5min, 30min in seconds
const MAX_ATTEMPTS = 3;

export function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  // Find active webhooks for this org + event
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, secret, events")
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (!webhooks || webhooks.length === 0) return;

  const matchingWebhooks = webhooks.filter(
    (w) => w.events.length === 0 || w.events.includes(event)
  );

  for (const webhook of matchingWebhooks) {
    await deliverWebhook(supabase, webhook, event, payload, 1);
  }
}

async function deliverWebhook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  webhook: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>,
  attempt: number
): Promise<void> {
  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  const signature = signPayload(body, webhook.secret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let deliveredAt: string | null = null;
  let nextRetryAt: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Spesenluchs-Signature": signature,
        "X-Spesenluchs-Event": event,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = response.status;
    responseBody = await response.text().catch(() => null);

    if (response.ok) {
      deliveredAt = new Date().toISOString();
    } else if (attempt < MAX_ATTEMPTS) {
      const delaySeconds = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    }
  } catch (error) {
    responseBody = error instanceof Error ? error.message : "Connection failed";
    if (attempt < MAX_ATTEMPTS) {
      const delaySeconds = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    }
  }

  // Log delivery
  await supabase.from("webhook_deliveries").insert({
    webhook_id: webhook.id,
    event,
    payload,
    response_status: responseStatus,
    response_body: responseBody?.substring(0, 10000) || null,
    attempt,
    delivered_at: deliveredAt,
    next_retry_at: nextRetryAt,
  });
}

export async function retryFailedDeliveries(): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Find deliveries due for retry
  const { data: pendingDeliveries } = await supabase
    .from("webhook_deliveries")
    .select("id, webhook_id, event, payload, attempt")
    .is("delivered_at", null)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", now)
    .limit(50);

  if (!pendingDeliveries || pendingDeliveries.length === 0) return 0;

  let retried = 0;

  for (const delivery of pendingDeliveries) {
    // Clear retry marker on old delivery
    await supabase
      .from("webhook_deliveries")
      .update({ next_retry_at: null })
      .eq("id", delivery.id);

    // Get webhook details
    const { data: webhook } = await supabase
      .from("webhooks")
      .select("id, url, secret")
      .eq("id", delivery.webhook_id)
      .eq("active", true)
      .single();

    if (!webhook) continue;

    await deliverWebhook(
      supabase,
      webhook,
      delivery.event,
      delivery.payload as Record<string, unknown>,
      delivery.attempt + 1
    );
    retried++;
  }

  return retried;
}
