import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the environment variable before importing
beforeEach(() => {
  vi.stubEnv("SSO_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
});

describe("encrypt/decrypt", () => {
  it("round-trips a simple string", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const plaintext = "my-secret-client-secret-value";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const { encrypt } = await import("../crypto");
    const plaintext = "test-value";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it("ciphertext has correct format (iv:tag:data)", async () => {
    const { encrypt } = await import("../crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^[a-f0-9]{24}$/); // 12-byte IV = 24 hex
    expect(parts[1]).toMatch(/^[a-f0-9]{32}$/); // 16-byte tag = 32 hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("handles unicode content", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const plaintext = "Ü日本語🎉";
    const decrypted = decrypt(encrypt(plaintext));
    expect(decrypted).toBe(plaintext);
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:ff${parts[2].substring(2)}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
