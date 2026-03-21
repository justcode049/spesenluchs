import { createClient } from "@/lib/supabase/server";

const MAX_REQUESTS_PER_HOUR = 1000;

export async function checkRateLimit(keyId: string): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = await createClient();
  const now = new Date();
  // Window start is the beginning of the current hour
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  // Try to increment existing counter
  const { data: existing } = await supabase
    .from("api_rate_limits")
    .select("request_count")
    .eq("key_id", keyId)
    .eq("window_start", windowStart.toISOString())
    .single();

  if (existing) {
    if (existing.request_count >= MAX_REQUESTS_PER_HOUR) {
      return { allowed: false, remaining: 0 };
    }

    await supabase
      .from("api_rate_limits")
      .update({ request_count: existing.request_count + 1 })
      .eq("key_id", keyId)
      .eq("window_start", windowStart.toISOString());

    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_HOUR - existing.request_count - 1,
    };
  }

  // Create new window
  await supabase.from("api_rate_limits").insert({
    key_id: keyId,
    window_start: windowStart.toISOString(),
    request_count: 1,
  });

  // Clean old windows (older than 2 hours)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await supabase
    .from("api_rate_limits")
    .delete()
    .eq("key_id", keyId)
    .lt("window_start", twoHoursAgo.toISOString());

  return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1 };
}
