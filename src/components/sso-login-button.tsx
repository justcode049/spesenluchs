"use client";

import { useState } from "react";

export function SsoLoginButton() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSsoLogin() {
    if (!email) return;
    setLoading(true);
    setError(null);

    // Redirect to SSO authorize endpoint
    window.location.href = `/api/auth/sso/authorize?email=${encodeURIComponent(email)}`;
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <p className="mb-3 text-center text-xs text-gray-500">Oder mit Firmen-SSO anmelden</p>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@firma.de"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSsoLogin}
          disabled={loading || !email}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "..." : "Mit Microsoft anmelden"}
        </button>
      </div>
    </div>
  );
}
