import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { User } from "./types";
import { syncPending } from "./offlineSync";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SupervisorPage from "./pages/SupervisorPage";
import DocumentsPage from "./pages/DocumentsPage";
import IssuesPage from "./pages/IssuesPage";
import ActionsPage from "./pages/ActionsPage";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionConductPage from "./pages/InspectionConductPage";
import InspectionReportPage from "./pages/InspectionReportPage";
import TemplatesPage from "./pages/TemplatesPage";
import TemplateBuilderPage from "./pages/TemplateBuilderPage";
import AssetsPage from "./pages/AssetsPage";

/** Renders the top-level route configuration, managing authentication state and redirecting unauthenticated users to the login page. */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const logout = () => { setUser(null); localStorage.removeItem("rigpro_token"); };

  const isSupervisor = useMemo(() => user?.role === "supervisor" || user?.role === "admin", [user]);

  useEffect(() => {
    const handleOnline = () => syncPending().catch(() => null);
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) syncPending().catch(() => null);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setUser} />} />
      <Route path="/dashboard"               element={user ? <DashboardPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />

      {/* Inspections */}
      <Route path="/inspections"             element={user ? <InspectionsPage        user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/inspections/conduct/:id" element={user ? <InspectionConductPage  user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/inspections/report/:id"  element={user ? <InspectionReportPage   user={user} onLogout={logout} /> : <Navigate to="/" replace />} />

      <Route path="/supervisor"              element={user && isSupervisor ? <SupervisorPage  user={user} onLogout={logout} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/documents"               element={user ? <DocumentsPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/issues"                  element={user ? <IssuesPage             user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/actions"                 element={user ? <ActionsPage            user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/templates"               element={user ? <TemplatesPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/templates/new"           element={user ? <TemplateBuilderPage    user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/templates/edit/:id"      element={user ? <TemplateBuilderPage    user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/assets"                  element={user ? <AssetsPage             user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/analytics"               element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
