import { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

type Props = { onLogin: (user: User) => void };

const DEMO_USERS = [
  { role: "Technician", email: "tech@rigpro.com",       password: "tech123"  },
  { role: "Supervisor", email: "supervisor@rigpro.com",  password: "super123" },
  { role: "Admin",      email: "admin@rigpro.com",       password: "admin123" },
];

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail]               = useState("tech@rigpro.com");
  const [password, setPassword]         = useState("tech123");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }
    setLoading(true);
    try {
      const data = await api<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("rigpro_token", data.token);
      onLogin(data.user);
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-brand-50">
      {/* Left brand panel */}
      <div className="hidden w-80 shrink-0 flex-col justify-between bg-brand-800 p-10 lg:flex">
        <div>
          <img src={`${import.meta.env.BASE_URL}rigpro-logo.png`} alt="RigPro" className="mb-6 h-14 w-auto brightness-0 invert" />
          <h1 className="font-display text-2xl font-bold leading-snug text-white">
            Job Safety Assessment<br />Platform
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-300">
            Digital safety management for marine and industrial operations.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-400">Demo accounts</p>
          <div className="space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.role}
                onClick={() => { setEmail(u.email); setPassword(u.password); }}
                className="w-full rounded-lg border border-brand-700 px-3 py-2 text-left transition-colors hover:bg-brand-700"
              >
                <span className="block text-xs font-bold text-white">{u.role}</span>
                <span className="block text-xs text-brand-400">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-500 lg:hidden">RigPro JSA</p>
          <h2 className="mb-1 font-display text-2xl font-bold text-brand-900">Sign in</h2>
          <p className="mb-6 text-sm text-brand-500">Access your safety dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-600">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-600">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 pr-10 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
