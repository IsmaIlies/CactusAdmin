import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminDashboard from "./AdminDashboard";
import AdminSalesPage from "./AdminSalesPage";
import SettingsPage from "./SettingsPage";
import MissionManagementPage from "./MissionManagementPage";
import ManagementPage from "./ManagementPage";
import ItRequestPage from "./ItRequestPage";
import AdminUsersPage from "./AdminUsersPage";

// import { useAuth } from "../contexts/AuthContext"; // Commenté avec les boutons de debug

const DashboardPage = () => {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/^\/admin\/canal/, "/dashboard");
  // const { debugUserRoles, refreshUserClaims } = useAuth(); // Commenté avec les boutons de debug

  // Détermine la page active à partir de l'URL
  let activePage = "home";
  if (normalizedPath === "/dashboard") activePage = "home";
  else if (normalizedPath.startsWith("/dashboard/sales"))
    activePage = "sales";
  else if (normalizedPath.startsWith("/dashboard/users"))
    activePage = "users";
  else if (normalizedPath.startsWith("/dashboard/admin-users"))
    activePage = "admin-users";
  else if (normalizedPath.startsWith("/dashboard/gestion-missions"))
    activePage = "gestion-missions";
  else if (normalizedPath.startsWith("/dashboard/management"))
    activePage = "management";
  else if (normalizedPath.startsWith("/dashboard/settings"))
    activePage = "settings";
  else if (normalizedPath.startsWith("/dashboard/it-request"))
    activePage = "it-request";

  const searchParams = new URLSearchParams(location.search);
  const activeMission = searchParams.get("mission") || "CANAL+";


  const isAdmin = () => {
    // Remplacez cette logique par la vérification réelle du rôle administrateur
    return true; // Exemple : Retourne true si l'utilisateur est administrateur
  };

  if (!isAdmin() && activeMission === "Leads" && normalizedPath.startsWith("/dashboard/sales")) {
    return <div className="p-6 text-red-500">Accès refusé : Vous n'avez pas accès aux données Canal+.</div>;
  }

  if (!isAdmin() && activeMission === "CANAL+" && normalizedPath.startsWith("/dashboard/leads-sales")) {
    return <div className="p-6 text-red-500">Accès refusé : Vous n'avez pas accès aux données Leads.</div>;
  }

  return (
    <div className="flex h-screen bg-sand-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        {/* Boutons de debug temporaires - commentés pour résoudre le problème de scroll */}
        {/* <div className="p-2 bg-yellow-100 border-b flex gap-2">
          <button
            onClick={debugUserRoles}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
          >
            Debug Rôles (Console)
          </button>
          <button
            onClick={refreshUserClaims}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Rafraîchir Claims
          </button>
        </div> */}

        <div className="h-full overflow-hidden">
          <div style={{ display: activePage === "home" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <AdminDashboard />
          </div>
          <div style={{ display: activePage === "sales" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <AdminSalesPage />
          </div>
          <div style={{ display: activePage === "gestion-missions" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <MissionManagementPage />
          </div>
          <div style={{ display: activePage === "management" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <ManagementPage />
          </div>
          <div style={{ display: activePage === "settings" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <SettingsPage />
          </div>
          <div style={{ display: activePage === "it-request" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <ItRequestPage />
          </div>
          {/* Craiyon retiré: utilisation d'un lien externe dans la sidebar */}
          <div style={{ display: activePage === "admin-users" ? "block" : "none" }} className="h-full overflow-auto p-6">
            <AdminUsersPage />
          </div>

          <div className="p-4 text-center text-lg font-bold">
            Statistiques pour la mission : {activeMission}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
