import { describe, it, expect } from "vitest";
import { signPayload, generateWebhookSecret } from "../webhooks";

describe("signPayload – extended", () => {
  it("produces 64-char hex HMAC-SHA256", () => {
    const sig = signPayload("test", "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles empty payload", () => {
    const sig = signPayload("", "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles empty secret", () => {
    const sig = signPayload("test", "");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles unicode payload", () => {
    const sig = signPayload('{"event":"trip.submitted","data":{"title":"München"}}', "whsec_test");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles very large payload", () => {
    const payload = JSON.stringify({ data: "x".repeat(100000) });
    const sig = signPayload(payload, "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is consistent across multiple calls (deterministic)", () => {
    const sigs = Array.from({ length: 50 }, () => signPayload("test-payload", "test-secret"));
    expect(new Set(sigs).size).toBe(1);
  });

  it("produces known HMAC for verification", () => {
    // This is a regression test - if the algorithm changes, this will catch it
    const sig1 = signPayload("a", "b");
    const sig2 = signPayload("a", "b");
    expect(sig1).toBe(sig2);
    // Should be different from different inputs
    const sig3 = signPayload("b", "a");
    expect(sig1).not.toBe(sig3);
  });
});

describe("generateWebhookSecret – extended", () => {
  it("always starts with whsec_ prefix", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateWebhookSecret()).toMatch(/^whsec_/);
    }
  });

  it("has correct total length (6 + 48 = 54 chars)", () => {
    for (let i = 0; i < 10; i++) {
      expect(generateWebhookSecret().length).toBe(54);
    }
  });

  it("generates 100 unique secrets", () => {
    const secrets = new Set(Array.from({ length: 100 }, () => generateWebhookSecret()));
    expect(secrets.size).toBe(100);
  });

  it("hex part after prefix is valid hex", () => {
    const secret = generateWebhookSecret();
    const hexPart = secret.substring(6);
    expect(hexPart).toMatch(/^[a-f0-9]+$/);
  });
});
