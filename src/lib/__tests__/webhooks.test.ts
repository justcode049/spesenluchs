import { describe, it, expect } from "vitest";
import { signPayload, generateWebhookSecret } from "../webhooks";

describe("signPayload", () => {
  it("produces consistent HMAC-SHA256 signature", () => {
    const payload = '{"event":"trip.submitted","data":{}}';
    const secret = "whsec_test123";

    const sig1 = signPayload(payload, secret);
    const sig2 = signPayload(payload, secret);
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different signatures for different payloads", () => {
    const secret = "whsec_test123";
    const sig1 = signPayload("payload1", secret);
    const sig2 = signPayload("payload2", secret);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different secrets", () => {
    const payload = "test";
    const sig1 = signPayload(payload, "secret1");
    const sig2 = signPayload(payload, "secret2");
    expect(sig1).not.toBe(sig2);
  });
});

describe("generateWebhookSecret", () => {
  it("generates secret with whsec_ prefix", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[a-f0-9]{48}$/);
  });

  it("generates unique secrets", () => {
    const s1 = generateWebhookSecret();
    const s2 = generateWebhookSecret();
    expect(s1).not.toBe(s2);
  });
});
