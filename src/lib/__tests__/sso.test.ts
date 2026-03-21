import { describe, it, expect } from "vitest";
import {
  generateAuthUrl,
  parseIdToken,
  generateState,
  generateNonce,
} from "../sso";

describe("generateAuthUrl", () => {
  it("generates valid Microsoft OIDC URL", () => {
    const url = generateAuthUrl(
      "tenant-123",
      "client-456",
      "https://app.example.com/callback",
      "state-abc",
      "nonce-xyz"
    );

    expect(url).toContain("login.microsoftonline.com/tenant-123");
    expect(url).toContain("client_id=client-456");
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=state-abc");
    expect(url).toContain("nonce=nonce-xyz");
    expect(url).toContain("scope=openid+email+profile");
  });
});

describe("parseIdToken", () => {
  it("parses valid JWT payload", () => {
    const payload = {
      sub: "user-123",
      email: "test@example.com",
      name: "Test User",
      iss: "https://login.microsoftonline.com/tenant/v2.0",
      aud: "client-id",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `header.${encoded}.signature`;

    const claims = parseIdToken(token);
    expect(claims.sub).toBe("user-123");
    expect(claims.email).toBe("test@example.com");
    expect(claims.name).toBe("Test User");
  });

  it("throws for invalid token format", () => {
    expect(() => parseIdToken("not.valid")).toThrow("Invalid ID token format");
  });

  it("throws for missing required claims", () => {
    const payload = { iss: "test" };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `h.${encoded}.s`;

    expect(() => parseIdToken(token)).toThrow("missing required claims");
  });

  it("throws for expired token", () => {
    const payload = {
      sub: "user-123",
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `h.${encoded}.s`;

    expect(() => parseIdToken(token)).toThrow("expired");
  });
});

describe("generateState", () => {
  it("generates 64-char hex string", () => {
    const state = generateState();
    expect(state).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique values", () => {
    expect(generateState()).not.toBe(generateState());
  });
});

describe("generateNonce", () => {
  it("generates 32-char hex string", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[a-f0-9]{32}$/);
  });
});
