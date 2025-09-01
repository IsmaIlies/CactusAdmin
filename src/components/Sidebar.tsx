import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  DollarSign,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Image,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = () => {
  const { user, logout, isAdmin, isDirection, isSuperviseur } = useAuth();
  const [isCanalDropdownOpen, setIsCanalDropdownOpen] = useState(false);
  const [activeMission, setActiveMission] = useState("CANAL+");

  const switchMission = (missionName: string) => {
    setActiveMission(missionName);
  };

  const updateActiveMissionFromPath = () => {
    if (window.location.pathname.startsWith("/dashboard/leads")) {
      setActiveMission("Leads");
    } else if (window.location.pathname.startsWith("/dashboard/canal")) {
      setActiveMission("CANAL+");
    }
  };

  React.useEffect(() => {
    updateActiveMissionFromPath();
  }, [window.location.pathname]);

  const shouldShowAdminSection = () => {
    return isAdmin();
  };

  const shouldShowMainNavigation = () => {
    const isLeadsSupervisor =
      Array.isArray(user?.missions) &&
      user.missions.some(
        (mission: { name: string; role: string }) =>
          mission.name === "Leads" && mission.role === "supervisor"
      );
    return isAdmin() || isDirection() || isSuperviseur() || isLeadsSupervisor;
  };


  return (
  <div className="bg-cactus-900 text-cactus-100 h-screen flex flex-col w-64 shrink-0">
      <div className="p-6 border-b border-cactus-700">
        <h1 className="text-3xl font-bold mb-3">Cactus</h1>
      </div>

      <div className="px-6 py-4">
        <button
          onClick={() => setIsCanalDropdownOpen(!isCanalDropdownOpen)}
          className="w-full flex items-center justify-between gap-2 bg-cactus-950/30 rounded-lg p-3 hover:bg-cactus-950/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="text-xs">
              <div className="text-cactus-100 font-medium">Mission Active</div>
              <div className="text-white font-bold">{activeMission}</div>
            </div>
          </div>
          {isCanalDropdownOpen ? (
            <ChevronUp className="w-4 h-4 text-cactus-100" />
          ) : (
            <ChevronDown className="w-4 h-4 text-cactus-100" />
          )}
        </button>

        {isCanalDropdownOpen && (
          <div className="mt-2 bg-cactus-950/20 rounded-lg p-3 space-y-2">
            <div className="text-xs text-cactus-100">
              <div className="font-medium mb-2">Missions disponibles</div>
              <div className="space-y-1">
                <div
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    activeMission === "CANAL+" ? "bg-cactus-700 text-white" : "hover:bg-cactus-600 text-cactus-100"
                  }`}
                  onClick={() => switchMission("CANAL+")}
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="font-medium">Canal+</span>
                </div>
                <div
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    activeMission === "Leads" ? "bg-cactus-700 text-white" : "hover:bg-cactus-600 text-cactus-100"
                  }`}
                  onClick={() => switchMission("Leads")}
                >
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="font-medium">Leads</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-6 space-y-1">
        <NavLink
          to="/dashboard/it-request"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-cactus-700/70 text-white"
                : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
            }`
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Demande IT
        </NavLink>

        {/* Lien externe vers Craiyon (visible uniquement pour les administrateurs) */}
        {isAdmin() && (
          <a
            href="https://www.craiyon.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start px-6 py-3 text-sm font-medium transition-colors text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
          >
            <Image className="w-5 h-5 mr-3 mt-0.5" />
            <div>
              <div>Craiyon</div>
              <div className="text-xs text-cactus-300">Générateur d’images gratuit et illimité via prompt</div>
            </div>
          </a>
        )}

        {shouldShowAdminSection() && (
          <React.Fragment>
            <div className="px-6 py-2">
              <h3 className="text-xs font-semibold text-cactus-300 uppercase tracking-wider">
                Administration
              </h3>
            </div>


            <NavLink
              to="/dashboard/admin-users"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cactus-700/70 text-white"
                    : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                }`
              }
            >
              <span className="mr-3" role="img" aria-label="utilisateur">👤</span>
              Gestion Utilisateurs
            </NavLink>

            <NavLink
              to="/dashboard/gestion-missions"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cactus-700/70 text-white"
                    : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                }`
              }
            >
              <span className="mr-3" role="img" aria-label="mission">🗂️</span>
              Gestion Missions
            </NavLink>

            {shouldShowMainNavigation() && (
              <React.Fragment>
                <div className="px-6 py-2">
                  <h3 className="text-xs font-semibold text-cactus-300 uppercase tracking-wider">
                    Application
                  </h3>
                </div>

                <NavLink
                  to={activeMission === "Leads" ? "/dashboard/leads" : "/dashboard/canal"}
                  end
                  className={({ isActive }) =>
                    `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-cactus-700/70 text-white"
                        : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Dashboard
                </NavLink>

                {activeMission === "Leads" && (
                  <NavLink
                    to="/dashboard/leads-sales"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-cactus-700/70 text-white"
                          : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                      }`
                    }
                  >
                    <DollarSign className="w-5 h-5 mr-3" />
                    Ventes Leads
                  </NavLink>
                )}

                {activeMission === "CANAL+" && (
                  <NavLink
                    to="/dashboard/sales"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-cactus-700/70 text-white"
                          : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                      }`
                    }
                  >
                    <DollarSign className="w-5 h-5 mr-3" />
                    Ventes Canal+
                  </NavLink>
                )}

                <NavLink
                  to="/dashboard/management"
                  className={({ isActive }) =>
                    `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-cactus-700/70 text-white"
                        : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                    }`
                  }
                >
                  <Briefcase className="w-5 h-5 mr-3" />
                  Management
                </NavLink>
                  <NavLink
                    to="/dashboard/import-csv"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-cactus-700/70 text-white"
                          : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                      }`
                    }
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Import CSV
                  </NavLink>
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </nav>

      <div className="p-4 border-t border-cactus-700 space-y-4">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-cactus-100 rounded-md hover:bg-cactus-700 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
