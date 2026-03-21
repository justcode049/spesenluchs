import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("SSO_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
});

describe("encrypt/decrypt – extended edge cases", () => {
  it("handles empty string", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles very long plaintext (10KB)", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const plaintext = "x".repeat(10000);
    const decrypted = decrypt(encrypt(plaintext));
    expect(decrypted).toBe(plaintext);
  });

  it("handles JSON content", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const json = JSON.stringify({ client_secret: "super-secret-123", tenant: "abc" });
    const decrypted = decrypt(encrypt(json));
    expect(JSON.parse(decrypted)).toEqual({ client_secret: "super-secret-123", tenant: "abc" });
  });

  it("throws on malformed ciphertext (wrong number of parts)", async () => {
    const { decrypt } = await import("../crypto");
    expect(() => decrypt("aabbcc")).toThrow("Invalid ciphertext format");
    expect(() => decrypt("aa:bb")).toThrow("Invalid ciphertext format");
    expect(() => decrypt("aa:bb:cc:dd")).toThrow("Invalid ciphertext format");
  });

  it("throws on modified IV", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    const modified = `${"ff".repeat(12)}:${parts[1]}:${parts[2]}`;
    expect(() => decrypt(modified)).toThrow();
  });

  it("throws on modified auth tag", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    const modified = `${parts[0]}:${"ff".repeat(16)}:${parts[2]}`;
    expect(() => decrypt(modified)).toThrow();
  });

  it("produces different output for different keys", async () => {
    const { encrypt: encrypt1 } = await import("../crypto");
    const ct1 = encrypt1("test");

    vi.stubEnv("SSO_ENCRYPTION_KEY", "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210");
    // Reset module cache to pick up new env
    vi.resetModules();
    const { encrypt: encrypt2 } = await import("../crypto");
    const ct2 = encrypt2("test");

    // Different keys should produce different ciphertext (except IV randomness)
    const data1 = ct1.split(":")[2];
    const data2 = ct2.split(":")[2];
    expect(data1).not.toBe(data2);
  });
});
