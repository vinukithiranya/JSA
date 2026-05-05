import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { User } from "../types";

type Props = {
  user: User;
  title: string;
  children: ReactNode;
  onLogout?: () => void;
};

export default function AppShell({ user, title, children, onLogout }: Props) {
  const location = useLocation();

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/jsa/new", label: "Create JSA" },
    { to: "/supervisor", label: "Supervisor" },
    { to: "/forms", label: "Form Builder" },
    { to: "/documents", label: "Documents" },
    { to: "/sync", label: "Offline Sync" },
  ];

  return (
    <div className="page-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card mb-6 flex flex-col gap-4 rounded-3xl p-5 shadow-card md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-sm uppercase tracking-[0.18em] text-brand-700">RigPro Safety</p>
            <h1 className="font-display text-2xl text-brand-900">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-brand-50 px-4 py-2 text-right">
              <p className="text-sm text-brand-700">{user.role}</p>
              <p className="font-semibold text-brand-900">{user.full_name}</p>
            </div>
            {onLogout ? (
              <button onClick={onLogout} className="rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">
                Logout
              </button>
            ) : null}
          </div>
        </header>

        <nav className="glass-card mb-6 flex flex-wrap gap-2 rounded-2xl p-3 shadow-card">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                location.pathname === item.to ? "bg-brand-700 text-white" : "bg-white text-brand-800 hover:bg-brand-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}
