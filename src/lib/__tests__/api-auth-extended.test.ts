import { describe, it, expect } from "vitest";
import { hashApiKey, generateApiKey, checkScope } from "../api-auth";
import type { ApiAuthResult } from "../api-auth";

describe("hashApiKey – extended", () => {
  it("handles empty string", () => {
    const hash = hashApiKey("");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles very long keys", () => {
    const hash = hashApiKey("sl_live_" + "a".repeat(1000));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles special characters", () => {
    const hash = hashApiKey("sl_live_!@#$%^&*()");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic across 100 calls", () => {
    const key = "sl_live_test123";
    const hashes = Array.from({ length: 100 }, () => hashApiKey(key));
    expect(new Set(hashes).size).toBe(1);
  });
});

describe("generateApiKey – extended", () => {
  it("key starts with sl_live_", () => {
    for (let i = 0; i < 10; i++) {
      expect(generateApiKey().key).toMatch(/^sl_live_/);
    }
  });

  it("prefix is first 12 chars of key", () => {
    for (let i = 0; i < 10; i++) {
      const { key, prefix } = generateApiKey();
      expect(prefix).toBe(key.substring(0, 12));
      expect(prefix).toBe("sl_live_" + key.substring(8, 12));
    }
  });

  it("hash matches hashApiKey output", () => {
    const { key, hash } = generateApiKey();
    expect(hashApiKey(key)).toBe(hash);
  });

  it("generates 50 unique keys", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().key));
    expect(keys.size).toBe(50);
  });

  it("key hex part is 32 characters", () => {
    const { key } = generateApiKey();
    const hexPart = key.replace("sl_live_", "");
    expect(hexPart).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("checkScope – extended", () => {
  function makeAuth(scopes: string[]): ApiAuthResult {
    return { organizationId: "org1", keyId: "key1", scopes };
  }

  it("allows any scope with empty scopes array", () => {
    const auth = makeAuth([]);
    expect(checkScope(auth, "trips:read")).toBe(true);
    expect(checkScope(auth, "receipts:write")).toBe(true);
    expect(checkScope(auth, "anything")).toBe(true);
  });

  it("allows any scope with wildcard", () => {
    const auth = makeAuth(["*"]);
    expect(checkScope(auth, "trips:read")).toBe(true);
    expect(checkScope(auth, "receipts:write")).toBe(true);
  });

  it("allows exact match", () => {
    const auth = makeAuth(["trips:read", "receipts:read"]);
    expect(checkScope(auth, "trips:read")).toBe(true);
    expect(checkScope(auth, "receipts:read")).toBe(true);
  });

  it("denies non-matching scope", () => {
    const auth = makeAuth(["trips:read"]);
    expect(checkScope(auth, "trips:write")).toBe(false);
    expect(checkScope(auth, "receipts:read")).toBe(false);
  });

  it("scope check is case-sensitive", () => {
    const auth = makeAuth(["Trips:Read"]);
    expect(checkScope(auth, "trips:read")).toBe(false);
    expect(checkScope(auth, "Trips:Read")).toBe(true);
  });

  it("handles multiple scopes with wildcard mixed in", () => {
    const auth = makeAuth(["trips:read", "*"]);
    expect(checkScope(auth, "anything")).toBe(true);
  });

  it("does not do partial matching", () => {
    const auth = makeAuth(["trips:read"]);
    expect(checkScope(auth, "trips")).toBe(false);
    expect(checkScope(auth, "trips:read:all")).toBe(false);
  });
});
