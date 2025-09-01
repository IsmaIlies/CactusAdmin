import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
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
          <Route path="/dashboard/leads" element={<LeadsDashboardPage />} />
            <Route path="/dashboard/import-csv" element={<ImportCsvPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </MissionProvider>
    </AuthProvider>
  );
}

export default App;
