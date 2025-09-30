import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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

type SectionProps = {
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

const Section: React.FC<SectionProps> = ({ title, icon, open, setOpen, children, className }) => {
  return (
    <div className={className ?? ""}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-cactus-950/30 rounded-lg p-3 hover:bg-cactus-950/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-cactus-100 font-medium">{title}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-cactus-100" /> : <ChevronDown className="w-4 h-4 text-cactus-100" />}
      </button>
      {open && <div className="mt-2 bg-cactus-950/20 rounded-lg p-2">{children}</div>}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { user, isAdmin, isDirection, isSuperviseur, logout } = useAuth();
  const location = useLocation();

  const [activeMission, setActiveMission] = useState<"CANAL+" | "Leads">("CANAL+");

  // Ouvertures des 4 sections
  const [openMission, setOpenMission] = useState(true);
  const [openApplication, setOpenApplication] = useState(true);
  const [openAdministration, setOpenAdministration] = useState(false);
  const [openInfos, setOpenInfos] = useState(true);

  const switchMission = (missionName: "CANAL+" | "Leads") => {
    setActiveMission(missionName);
  };

  const updateActiveMissionFromPath = () => {
    if (location.pathname.startsWith("/dashboard/leads")) {
      setActiveMission("Leads");
    } else if (location.pathname.startsWith("/dashboard/canal") || location.pathname.startsWith("/dashboard/sales")) {
      setActiveMission("CANAL+");
    }
  };

  useEffect(() => {
    updateActiveMissionFromPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const shouldShowAdminSection = () => isAdmin();

  const shouldShowMainNavigation = () => {
    const isLeadsSupervisor =
      Array.isArray(user?.missions) &&
      user.missions.some(
        (mission: { name: string; role: string }) =>
          mission.name === "Leads" && mission.role === "supervisor"
      );
    return isAdmin() || isDirection() || isSuperviseur() || isLeadsSupervisor;
  };

  // Vérifie si l'utilisateur est superviseur pour une mission CANAL (ex: "Canal+", "Canal + CIV")
  const isCanalSupervisor = () => {
    if (!user) return false;

    // 1) Vérifier claims/roles et missions assignées
    const claimMissions = user.customClaims?.missions || [];
    // Normaliser assignedMissions : peut être undefined, string, ou array
    const assignedRaw = (user as any).assignedMissions;
    const assigned: string[] = Array.isArray(assignedRaw)
      ? assignedRaw
      : typeof assignedRaw === "string"
      ? [assignedRaw]
      : [];

    const missionNamesFromClaims = Array.isArray(claimMissions) ? claimMissions : [];

    // 2) Vérifier structure user.missions si présente
    const missionsField = Array.isArray((user as any).missions) ? (user as any).missions : [];

    const checkNameIsCanal = (name: string | undefined | null) => {
      if (!name) return false;
      const lower = name.toString().toLowerCase();
      return lower.includes("canal") || lower.includes("canal+") || lower.includes("canal + civ") || lower.includes("canal+civ") || lower.includes("canal civ");
    };

  // Vérifier missions assignées simples (ids ou noms)
  if (assigned.some((m) => typeof m === "string" && checkNameIsCanal(m))) return true;
    if (missionNamesFromClaims.some((m: any) => typeof m === 'string' && checkNameIsCanal(m))) return true;

    // Vérifier user.missions entries
    if (
      missionsField.some(
        (m: any) => (m.name && checkNameIsCanal(m.name) && (m.role === 'supervisor' || m.role === 'superviseur'))
      )
    ) {
      return true;
    }

    // fallback: vérifier role global + custom claim superviseur
    if ((user.role === "superviseur" || user.role === "supervisor") && assigned.length > 0) {
      // si superviseur global mais aucune mission listée, ne pas accorder automatiquement
      return assigned.some((m) => checkNameIsCanal(m));
    }

    return false;
  };

  return (
    <div className="bg-cactus-900 text-cactus-100 h-screen flex flex-col w-64 shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-cactus-700">
        <h1 className="text-3xl font-bold mb-3">Cactus</h1>
      </div>

      {/* Section 1 : Mission active */}
      <div className="px-6 py-4">
        <Section
          title="Mission active"
          open={openMission}
          setOpen={setOpenMission}
        >
          <div className="p-2 space-y-2">
            <div className="text-xs text-cactus-100">
              <div className="font-medium mb-2">Missions disponibles</div>
              <div className="space-y-1">
                <div
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    activeMission === "CANAL+"
                      ? "bg-cactus-700 text-white"
                      : "hover:bg-cactus-600 text-cactus-100"
                  }`}
                  onClick={() => switchMission("CANAL+")}
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="font-medium">Canal+</span>
                </div>
                <div
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    activeMission === "Leads"
                      ? "bg-cactus-700 text-white"
                      : "hover:bg-cactus-600 text-cactus-100"
                  }`}
                  onClick={() => switchMission("Leads")}
                >
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="font-medium">Leads</span>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
        {/* Section 2 : Application */}
        {shouldShowMainNavigation() && (
          <Section
            title="Application"
            icon={<LayoutDashboard className="w-4 h-4" />}
            open={openApplication}
            setOpen={setOpenApplication}
          >
            <div className="flex flex-col py-1">
              <NavLink
                to={activeMission === "Leads" ? "/dashboard/leads" : "/dashboard/canal"}
                end
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-cactus-700/70 text-white"
                      : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                  }`
                }
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </NavLink>

              <NavLink
                to="/dashboard/presence-ta"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-cactus-700/70 text-white"
                      : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                  }`
                }
              >
                <span className="mr-3" role="img" aria-label="presence">🗓️</span>
                Présence TA
              </NavLink>

              {(isAdmin() || isDirection() || isCanalSupervisor()) && (
                <>
                  {activeMission === "Leads" && (
                    <NavLink
                      to="/dashboard/leads-sales"
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                      `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                      `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Import CSV
                  </NavLink>
                </>
              )}
            </div>
          </Section>
        )}

        {/* Section 3 : Administration (admin only, plus certains superviseurs Canal) */}
        {(shouldShowAdminSection() || isCanalSupervisor()) && (
          <Section
            title="Administration"
            icon={<Briefcase className="w-4 h-4" />}
            open={openAdministration}
            setOpen={setOpenAdministration}
          >
            <div className="flex flex-col py-1">
              <NavLink
                to="/dashboard/admin-users"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-cactus-700/70 text-white"
                      : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                  }`
                }
              >
                <span className="mr-3" role="img" aria-label="mission">🗂️</span>
                Gestion Missions
              </NavLink>

              <NavLink
                to="/dashboard/checklist-admin"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-cactus-700/70 text-white"
                      : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                  }`
                }
              >
                <span className="mr-3" role="img" aria-label="heures">⏱️</span>
                Checklist Heures (Admin)
              </NavLink>
            </div>
          </Section>
        )}

        {/* Section 4 : Infos & Demandes */}
        <Section
          title="Infos & Demandes"
          icon={<Image className="w-4 h-4" />}
          open={openInfos}
          setOpen={setOpenInfos}
        >
          <div className="flex flex-col py-1">
            <NavLink
              to="/dashboard/nouveautes"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-cactus-700/70 text-white"
                    : "text-cactus-100 hover:bg-cactus-700/60 hover:text-white"
                }`
              }
            >
              <Image className="w-5 h-5 mr-3" />
              Nouveautés
            </NavLink>

            {(isAdmin() || isDirection()) && (
              <NavLink
                to="/dashboard/it-request"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Demande IT
              </NavLink>
            )}
          </div>
        </Section>
      </nav>

      {/* Footer */}
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
