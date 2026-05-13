import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { User } from "../types";

interface LayoutProps {
  user: User | null;
  title: string;
  onLogout?: () => void;
  children: React.ReactNode;
}

const NAV = [
  { to: "/dashboard",    label: "Dashboard",    icon: "▦" },
  { to: "/inspections",  label: "Inspections",  icon: "📋" },
  { to: "/issues",       label: "Issues",       icon: "⚠" },
  { to: "/actions",      label: "Actions",      icon: "✓" },
  { to: "/scheduling",   label: "Scheduling",   icon: "📅" },
  { to: "/documents",    label: "Documents",    icon: "≡" },
  { to: "/sync",         label: "Offline Sync", icon: "↻" },
];

const SUP_NAV = [
  { to: "/supervisor",   label: "Approval Queue", icon: "⊙" },
  { to: "/forms",        label: "Form Builder",   icon: "⊞" },
];

const Layout: React.FC<LayoutProps> = ({ user, title, onLogout, children }) => {
  const loc = useLocation();
  const isSup = user?.role === "supervisor" || user?.role === "admin";
  const links = isSup ? [...NAV, ...SUP_NAV] : NAV;

  const roleBadge =
    user?.role === "admin"      ? "bg-red-100 text-red-700"      :
    user?.role === "supervisor" ? "bg-amber-100 text-amber-700"  :
    user?.role === "technician" ? "bg-brand-100 text-brand-700"  :
    "bg-gray-100 text-gray-500";

  return (
    <div className="flex min-h-screen bg-brand-50">
      {/* Sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 px-5 py-4">
          <img src="/rigpro-logo.png" alt="RigPro" className="mb-1 h-12 w-auto" />
          <p className="text-xs font-medium text-brand-500">JSA Platform</p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {links.map((l) => {
            const active =
              l.to === "/dashboard"
                ? loc.pathname === "/dashboard"
                : loc.pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand-700 text-white" : "text-brand-700 hover:bg-brand-50"
                }`}
              >
                <span className="w-4 shrink-0 text-center text-sm leading-none">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-brand-100 px-4 py-3">
          <p className="truncate text-sm font-semibold text-brand-900">{user?.full_name}</p>
          <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${roleBadge}`}>
            {user?.role}
          </span>
          <button
            onClick={onLogout}
            className="mt-2 block text-xs text-brand-400 transition-colors hover:text-brand-700"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-brand-100 bg-white px-6 py-3">
          <h1 className="font-display text-lg font-semibold text-brand-900">{title}</h1>
        </header>
        <main className="flex-1 overflow-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
