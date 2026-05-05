import { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

type Props = { onLogin: (user: User) => void };

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("tech@rigpro.com");
  const [password, setPassword] = useState("tech123");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("rigpro_token", data.token);
      onLogin(data.user);
    } catch {
      setError("Invalid login. Try tech@rigpro.com / tech123 or admin@rigpro.com / admin123");
    }
  }

  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleLogin} className="glass-card w-full max-w-md rounded-3xl p-8 shadow-card">
        <p className="mb-2 font-display text-xs uppercase tracking-[0.2em] text-brand-700">RigPro JSA</p>
        <h1 className="mb-6 font-display text-3xl text-brand-900">Safety Platform Login</h1>

        <label className="mb-2 block text-sm font-semibold text-brand-800">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full rounded-xl border border-brand-200 bg-white px-3 py-2" />

        <label className="mb-2 block text-sm font-semibold text-brand-800">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-6 w-full rounded-xl border border-brand-200 bg-white px-3 py-2" />

        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        <button className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-800">Sign in</button>
      </form>
    </div>
  );
}
