import { describe, it, expect } from "vitest";
import { generateAuthUrl, parseIdToken, generateState, generateNonce } from "../sso";

describe("generateAuthUrl – extended", () => {
  it("encodes redirect_uri with special characters", () => {
    const url = generateAuthUrl("t", "c", "https://app.example.com/callback?foo=bar", "s", "n");
    expect(url).toContain("redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback%3Ffoo%3Dbar");
  });

  it("includes all required OIDC parameters", () => {
    const url = generateAuthUrl("tenant", "client", "https://cb.com", "state123", "nonce456");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("client_id")).toBe("client");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    expect(parsed.searchParams.get("state")).toBe("state123");
    expect(parsed.searchParams.get("nonce")).toBe("nonce456");
    expect(parsed.searchParams.get("response_mode")).toBe("query");
  });

  it("uses correct Microsoft endpoint with tenant", () => {
    const url = generateAuthUrl("my-tenant-id", "c", "https://cb.com", "s", "n");
    expect(url.startsWith("https://login.microsoftonline.com/my-tenant-id/oauth2/v2.0/authorize")).toBe(true);
  });
});

describe("parseIdToken – extended", () => {
  function makeToken(payload: Record<string, unknown>): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `header.${encoded}.signature`;
  }

  it("extracts optional name and preferred_username", () => {
    const claims = parseIdToken(makeToken({
      sub: "user-1", email: "test@example.com",
      name: "John Doe", preferred_username: "johndoe@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    expect(claims.name).toBe("John Doe");
    expect(claims.preferred_username).toBe("johndoe@example.com");
  });

  it("extracts roles array when present", () => {
    const claims = parseIdToken(makeToken({
      sub: "user-1", email: "test@example.com",
      roles: ["Admin", "Manager"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    expect(claims.roles).toEqual(["Admin", "Manager"]);
  });

  it("handles token without exp (no expiration check)", () => {
    const claims = parseIdToken(makeToken({
      sub: "user-1", email: "test@example.com",
    }));
    expect(claims.sub).toBe("user-1");
  });

  it("extracts iss and aud", () => {
    const claims = parseIdToken(makeToken({
      sub: "user-1", email: "test@example.com",
      iss: "https://login.microsoftonline.com/tenant/v2.0",
      aud: "my-client-id",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    expect(claims.iss).toBe("https://login.microsoftonline.com/tenant/v2.0");
    expect(claims.aud).toBe("my-client-id");
  });

  it("throws for token with only 2 parts", () => {
    expect(() => parseIdToken("header.payload")).toThrow("Invalid ID token");
  });

  it("throws for token with 4 parts", () => {
    expect(() => parseIdToken("a.b.c.d")).toThrow("Invalid ID token");
  });
});

describe("generateState/generateNonce – extended", () => {
  it("generates 100 unique states", () => {
    const states = new Set(Array.from({ length: 100 }, () => generateState()));
    expect(states.size).toBe(100);
  });

  it("generates 100 unique nonces", () => {
    const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
    expect(nonces.size).toBe(100);
  });

  it("state is hex only", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateState()).toMatch(/^[a-f0-9]+$/);
    }
  });

  it("nonce is hex only", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateNonce()).toMatch(/^[a-f0-9]+$/);
    }
  });
});
