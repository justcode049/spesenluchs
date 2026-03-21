"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SsoLoginButton } from "@/components/sso-login-button";

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="Spesenluchs" className="h-8 w-8 rounded-lg" />
            <h1 className="text-xl font-bold text-gray-900">Spesenluchs</h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Open-Source Demo
            </span>
          </div>
          <a
            href="https://github.com/justcode049/spesenluchs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </header>

      {/* Hero + Login */}
      <section className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Left: Hero Text */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              KI-gesteuerte<br />Spesenerfassung
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Belege fotografieren, KI extrahiert die Daten, Tagespauschalen werden automatisch berechnet, Export nach DATEV/SAP/enventa.
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <strong>Technische Demo</strong> – Dieses Projekt ist ein Open-Source-Showcase und keine kommerzielle Anwendung. Der Quellcode ist frei verfugbar auf GitHub.
              </p>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Anmelden</h3>

            <form onSubmit={handleLogin} className="space-y-3">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div>
                <label htmlFor="landing-email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="landing-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="max@beispiel.de"
                />
              </div>
              <div>
                <label htmlFor="landing-password" className="block text-sm font-medium text-gray-700">Passwort</label>
                <input
                  id="landing-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Wird angemeldet..." : "Anmelden"}
              </button>
            </form>

            <SsoLoginButton />

            <p className="mt-4 text-center text-sm text-gray-500">
              Noch kein Konto?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Registrieren
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h3 className="mb-8 text-center text-2xl font-bold text-gray-900">Features</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl">
                  {f.icon}
                </div>
                <h4 className="font-semibold text-gray-900">{f.title}</h4>
                <p className="mt-1 text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h3 className="mb-6 text-center text-lg font-semibold text-gray-900">Tech Stack</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((t) => (
              <span key={t} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-medium text-gray-900">Spesenluchs</p>
              <p className="text-xs text-gray-500">Open-Source KI-Spesenerfassung – Technische Demo</p>
            </div>
            <div className="flex gap-4">
              <a
                href="https://github.com/justcode049/spesenluchs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                GitHub Repository
              </a>
              <span className="text-sm text-gray-400">MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "\u{1F4F7}",
    title: "KI-Belegextraktion",
    description: "Beleg fotografieren, Claude AI extrahiert Datum, Betrag, MwSt, Haendler und Belegart automatisch.",
  },
  {
    icon: "\u{1F4C5}",
    title: "Tagespauschalen",
    description: "Automatische Berechnung nach \u00A79 EStG mit 30+ Laenderpauschalen und Mahlzeitenabzuegen.",
  },
  {
    icon: "\u{1F4E4}",
    title: "DATEV / SAP / enventa",
    description: "Export als DATEV-EXTF mit Belegverknuepfung, SAP IDoc oder direkt an enventa REST-API.",
  },
  {
    icon: "\u{2705}",
    title: "Genehmigungsworkflow",
    description: "Reisen einreichen, Manager genehmigen oder ablehnen. GoBD-konforme Unveraenderbarkeit.",
  },
  {
    icon: "\u{1F517}",
    title: "REST API + Webhooks",
    description: "Vollstaendige v1 API mit API-Keys, Rate-Limiting, OpenAPI-Spec und Webhook-Events.",
  },
  {
    icon: "\u{1F512}",
    title: "Enterprise SSO",
    description: "Microsoft Entra ID / Azure AD Integration mit OIDC, JIT Provisioning und Role Mapping.",
  },
];

const techStack = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Supabase",
  "Claude AI",
  "Tailwind CSS 4",
  "Playwright",
  "Vitest",
];
