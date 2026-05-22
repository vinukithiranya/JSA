import { Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import type { User } from "./types";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReviewPage from "./pages/ReviewPage";
import SupervisorPage from "./pages/SupervisorPage";
import DocumentsPage from "./pages/DocumentsPage";
import SyncPage from "./pages/SyncPage";
import IssuesPage from "./pages/IssuesPage";
import ActionsPage from "./pages/ActionsPage";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionConductPage from "./pages/InspectionConductPage";
import InspectionReportPage from "./pages/InspectionReportPage";
import JsaReportPage from "./pages/JsaReportPage";
import TemplatesPage from "./pages/TemplatesPage";
import TemplateBuilderPage from "./pages/TemplateBuilderPage";
import AssetsPage from "./pages/AssetsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const logout = () => { setUser(null); localStorage.removeItem("rigpro_token"); };

  const isSupervisor = useMemo(() => user?.role === "supervisor" || user?.role === "admin", [user]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setUser} />} />
      <Route path="/dashboard"               element={user ? <DashboardPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />

      {/* Inspections */}
      <Route path="/inspections"             element={user ? <InspectionsPage        user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/inspections/conduct/:id" element={user ? <InspectionConductPage  user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/inspections/report/:id"  element={user ? <InspectionReportPage   user={user} onLogout={logout} /> : <Navigate to="/" replace />} />

      {/* JSA review + report */}
      <Route path="/jsa/review/:id"          element={user ? <ReviewPage             user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/jsa/report/:id"          element={user ? <JsaReportPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />

      <Route path="/supervisor"              element={user && isSupervisor ? <SupervisorPage  user={user} onLogout={logout} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/documents"               element={user ? <DocumentsPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/sync"                    element={user ? <SyncPage               user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/issues"                  element={user ? <IssuesPage             user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/actions"                 element={user ? <ActionsPage            user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/templates"               element={user ? <TemplatesPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/templates/new"           element={user ? <TemplateBuilderPage    user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/templates/edit/:id"      element={user ? <TemplateBuilderPage    user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/assets"                  element={user ? <AssetsPage             user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/analytics"               element={user ? <AnalyticsPage          user={user} onLogout={logout} /> : <Navigate to="/" replace />} />
    </Routes>
  );
}
