import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Mission } from "../services/missionService";
import { useAuth } from "./AuthContext";
import missionService from "../services/missionService";

interface MissionContextType {
  availableMissions: Mission[];
  loading: boolean;
  refreshMissions: () => Promise<void>;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const useMission = () => {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error("useMission must be used within a MissionProvider");
  }
  return context;
};

export const MissionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isAdmin } = useAuth();
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMissions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let missions: Mission[] = [];

      // Chargement des missions pour la gestion administrative
      if (isAdmin()) {
        missions = await missionService.getMissions();
      }

      setAvailableMissions(missions);
    } catch (error) {
      console.error("Erreur lors du chargement des missions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMissions();
  }, [user, isAdmin]);

  const value: MissionContextType = {
    availableMissions,
    loading,
    refreshMissions,
  };

  return (
    <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
  );
};
