import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminControlCenterPage from "./pages/AdminControlCenterPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AuthActionPage from "./pages/AuthActionPage";
import InitializeAdminPage from "./pages/InitializeAdminPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import { AuthProvider } from "./contexts/AuthContext";
import { MissionProvider } from "./contexts/MissionContext";
import PublicRoute from "./components/PublicRoute";
import AdminProtection from "./components/AdminProtection";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import UserManagementPage from "./pages/UserManagementPage";
import LeadsDashboardPage from "./pages/LeadsDashboardPage";
import ImportCsvPage from "./pages/ImportCsvPage";
import PresenceTAPage from "./pages/PresenceTAPage";
import NouveautesPage from "./pages/NouveautesPage";
import ChecklistAdminShell from "./pages/ChecklistAdminShell";
import ChecklistArchivesShell from "./pages/ChecklistArchivesShell";
import AdminLeadsLayout from "./pages/admin/leads/AdminLeadsLayout";
import AdminLeadsDashboardPage from "./pages/admin/leads/AdminLeadsDashboardPage";
import AdminLeadsSalesPage from "./pages/admin/leads/AdminLeadsSalesPage";
import AdminLeadsChecklistPage from "./pages/admin/leads/AdminLeadsChecklistPage";

function App() {
  return (
    <AuthProvider>
      <MissionProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login/admin"
            element={
              <PublicRoute>
                <AdminLoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route path="/dashboard/users" element={<UserManagementPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          <Route path="/auth/action" element={<AuthActionPage />} />
          <Route path="/initialize-admin" element={<InitializeAdminPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route
            path="/dashboard/*"
            element={
              <AdminProtection requiredRole="superviseur">
                <DashboardPage />
              </AdminProtection>
            }
          />
          <Route
            path="/dashboard/presence-ta"
            element={
              <AdminProtection requiredRole="superviseur">
                <PresenceTAPage />
              </AdminProtection>
            }
          />
          <Route path="/dashboard/leads" element={<LeadsDashboardPage />} />
          <Route path="/dashboard/import-csv" element={<ImportCsvPage />} />
          <Route path="/dashboard/nouveautes" element={<NouveautesPage />} />
          <Route
            path="/dashboard/checklist-admin"
            element={
              <AdminProtection requiredRole="superviseur">
                <ChecklistAdminShell />
              </AdminProtection>
            }
          />
          <Route
            path="/dashboard/checklist-archives"
            element={
              <AdminProtection requiredRole="superviseur">
                <ChecklistArchivesShell />
              </AdminProtection>
            }
          />
          <Route
            path="/admin/leads"
            element={
              <AdminProtection requiredRole="admin">
                <AdminLeadsLayout />
              </AdminProtection>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminLeadsDashboardPage />} />
            <Route path="sales" element={<AdminLeadsSalesPage />} />
            <Route path="checklist" element={<AdminLeadsChecklistPage />} />
          </Route>
          <Route
            path="/admin/control"
            element={
              <AdminProtection requiredRole="admin">
                <AdminControlCenterPage />
              </AdminProtection>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminProtection requiredRole="admin">
                <AdminUsersPage />
              </AdminProtection>
            }
          />
          <Route
            path="/admin/canal/*"
            element={
              <AdminProtection requiredRole="admin">
                <DashboardPage />
              </AdminProtection>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </MissionProvider>
    </AuthProvider>
  );
}

export default App;
