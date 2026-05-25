import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { User } from "../types";
import { notificationsApi, type Notification } from "../api";

interface LayoutProps {
  user: User | null;
  title: string;
  onLogout?: () => void;
  children: React.ReactNode;
}

// ── Inline SVG Icons ─────────────────────────────────────────────────────────

const Ico = {
  Home: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Template: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Clipboard: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Calendar: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Document: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Training: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  Box: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Users: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Sync: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Shield: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Grid: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Menu: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Analytics: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

// ── Nav config ────────────────────────────────────────────────────────────────

type NavItem = { to: string; label: string; Icon: () => JSX.Element };

const NAV: NavItem[] = [
  { to: "/dashboard",   label: "Home",         Icon: Ico.Home      },
  { to: "/analytics",   label: "Analytics",    Icon: Ico.Analytics },
  { to: "/templates",   label: "Templates",    Icon: Ico.Template  },
  { to: "/inspections", label: "Inspections",  Icon: Ico.Clipboard },
  { to: "/issues",      label: "Issues",       Icon: Ico.Alert     },
  { to: "/actions",     label: "Actions",      Icon: Ico.Check     },
  { to: "/assets",      label: "Assets",       Icon: Ico.Box       },
  { to: "/documents",   label: "Documents",    Icon: Ico.Document  },
  { to: "/sync",        label: "Offline Sync", Icon: Ico.Sync      },
];

const SUP_NAV: NavItem[] = [
  { to: "/supervisor", label: "Approval Queue", Icon: Ico.Shield },
];

// ── Notification Bell ─────────────────────────────────────────────────────────

function NotificationBell({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await notificationsApi.unreadCount(user.id);
      setUnread(count);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchCount();
    const timer = setInterval(fetchCount, 30_000);
    return () => clearInterval(timer);
  }, [fetchCount]);

  async function openPanel() {
    if (!user) return;
    setOpen(v => !v);
    if (!open) {
      try {
        const list = await notificationsApi.list(user.id);
        setNotifications(list);
        setUnread(0);
      } catch { /* silent */ }
    }
  }

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function handleMarkAll() {
    if (!user) return;
    await notificationsApi.markAllRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  function handleClick(n: Notification) {
    if (!n.is_read) handleMarkRead(n.id);
    if (n.link) { navigate(n.link); setOpen(false); }
  }

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const dotColor: Record<string, string> = {
    critical: "bg-red-500",
    warning:  "bg-amber-400",
    success:  "bg-green-500",
    info:     "bg-sky-400",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openPanel}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 transition hover:bg-brand-50 hover:text-brand-800"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Notifications</p>
            {notifications.some(n => !n.is_read) && (
              <button onClick={handleMarkAll} className="text-xs text-brand-500 hover:text-brand-800">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-brand-400">No notifications</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-brand-50 ${n.is_read ? "opacity-60" : ""}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor[n.event_type] ?? "bg-sky-400"} ${n.is_read ? "opacity-0" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-brand-800">{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-brand-400">
                      {new Date(n.created_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const Layout: React.FC<LayoutProps> = ({ user, title, onLogout, children }) => {
  const loc = useLocation();
  const isSup = user?.role === "supervisor" || user?.role === "admin";
  const links = isSup ? [...NAV, ...SUP_NAV] : NAV;
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem("sidebarOpen") !== "false"
  );

  function toggleSidebar(open: boolean) {
    setSidebarOpen(open);
    localStorage.setItem("sidebarOpen", String(open));
  }

  const initials = user?.full_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen bg-brand-50">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className={`flex shrink-0 flex-col border-r border-brand-100 bg-white transition-all duration-200 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}`}>
        {/* Logo */}
        <div className="flex h-14 w-56 items-center gap-2.5 border-b border-brand-100 px-4">
          <img src={`${import.meta.env.BASE_URL}rigpro-logo.png`} alt="RigPro" className="h-8 w-auto" />
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight text-brand-900">RigPro</p>
            <p className="text-[10px] font-medium leading-tight text-brand-400">JSA Platform</p>
          </div>
          <button
            onClick={() => toggleSidebar(false)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-brand-400 hover:bg-brand-50 hover:text-brand-700"
            aria-label="Collapse sidebar"
          >
            <Ico.ChevronLeft />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {links.map((l, i) => {
            const isSepBefore = isSup && l.to === "/supervisor" && i > 0;
            const active =
              l.to === "/dashboard"
                ? loc.pathname === "/dashboard"
                : loc.pathname.startsWith(l.to);
            return (
              <React.Fragment key={l.to}>
                {isSepBefore && (
                  <div className="my-2 border-t border-brand-100" />
                )}
                <Link
                  to={l.to}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-700 text-white"
                      : "text-brand-600 hover:bg-brand-50 hover:text-brand-900"
                  }`}
                >
                  <span className={`shrink-0 ${active ? "text-white" : "text-brand-400"}`}>
                    <l.Icon />
                  </span>
                  {l.label}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="border-t border-brand-100 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-brand-900">{user?.full_name}</p>
              <p className="truncate text-xs capitalize text-brand-400">{user?.role}</p>
            </div>
            <Ico.ChevronRight />
          </div>
          <button
            onClick={onLogout}
            className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-brand-100 bg-white px-6">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => toggleSidebar(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 transition hover:bg-brand-50 hover:text-brand-800"
                aria-label="Expand sidebar"
              >
                <Ico.Menu />
              </button>
            )}
            <h1 className="font-display text-base font-semibold text-brand-900">{title}</h1>
          </div>
          <NotificationBell user={user} />
        </header>
        <main className="flex-1 overflow-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
