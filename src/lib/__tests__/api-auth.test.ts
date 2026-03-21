import { describe, it, expect } from "vitest";
import { hashApiKey, generateApiKey, checkScope } from "../api-auth";
import type { ApiAuthResult } from "../api-auth";

describe("hashApiKey", () => {
  it("produces consistent SHA-256 hash", () => {
    const hash1 = hashApiKey("sl_live_abcdef1234567890");
    const hash2 = hashApiKey("sl_live_abcdef1234567890");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different keys", () => {
    const hash1 = hashApiKey("sl_live_key1");
    const hash2 = hashApiKey("sl_live_key2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("generateApiKey", () => {
  it("generates key with correct format", () => {
    const { key, prefix, hash } = generateApiKey();
    expect(key).toMatch(/^sl_live_[a-f0-9]{32}$/);
    expect(prefix).toBe(key.substring(0, 12));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey(key)).toBe(hash);
  });

  it("generates unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.key).not.toBe(key2.key);
    expect(key1.hash).not.toBe(key2.hash);
  });
});

describe("checkScope", () => {
  it("returns true for empty scopes (full access)", () => {
    const auth: ApiAuthResult = {
      organizationId: "org1",
      keyId: "key1",
      scopes: [],
    };
    expect(checkScope(auth, "trips:read")).toBe(true);
  });

  it("returns true for wildcard scope", () => {
    const auth: ApiAuthResult = {
      organizationId: "org1",
      keyId: "key1",
      scopes: ["*"],
    };
    expect(checkScope(auth, "trips:read")).toBe(true);
  });

  it("returns true when scope matches", () => {
    const auth: ApiAuthResult = {
      organizationId: "org1",
      keyId: "key1",
      scopes: ["trips:read", "receipts:read"],
    };
    expect(checkScope(auth, "trips:read")).toBe(true);
  });

  it("returns false when scope doesn't match", () => {
    const auth: ApiAuthResult = {
      organizationId: "org1",
      keyId: "key1",
      scopes: ["trips:read"],
    };
    expect(checkScope(auth, "trips:write")).toBe(false);
  });
});
