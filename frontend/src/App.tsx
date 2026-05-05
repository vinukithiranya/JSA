import { Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import type { User } from "./types";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import JsaWizardPage from "./pages/JsaWizardPage";
import ReviewPage from "./pages/ReviewPage";
import SupervisorPage from "./pages/SupervisorPage";
import FormBuilderPage from "./pages/FormBuilderPage";
import DocumentsPage from "./pages/DocumentsPage";
import SyncPage from "./pages/SyncPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const isSupervisor = useMemo(() => user?.role === "supervisor" || user?.role === "admin", [user]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setUser} />} />
      <Route path="/dashboard" element={user ? <DashboardPage user={user} onLogout={() => setUser(null)} /> : <Navigate to="/" replace />} />
      <Route path="/jsa/new" element={user ? <JsaWizardPage user={user} /> : <Navigate to="/" replace />} />
      <Route path="/jsa/review/:id" element={user ? <ReviewPage user={user} /> : <Navigate to="/" replace />} />
      <Route path="/supervisor" element={user && isSupervisor ? <SupervisorPage user={user} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/forms" element={user && isSupervisor ? <FormBuilderPage user={user} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/documents" element={user ? <DocumentsPage user={user} /> : <Navigate to="/" replace />} />
      <Route path="/sync" element={user ? <SyncPage user={user} /> : <Navigate to="/" replace />} />
    </Routes>
  );
}
