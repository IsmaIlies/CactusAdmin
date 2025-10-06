import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

export type EntityScope = "canal-fr" | "canal-civ" | "leads";

interface EntityContextType {
  entity: EntityScope;
  setEntity: (e: EntityScope) => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export const useEntity = () => {
  const ctx = useContext(EntityContext);
  if (!ctx) throw new Error("useEntity must be used within an EntityProvider");
  return ctx;
};

export const EntityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entity, setEntity] = useState<EntityScope>("canal-fr");
  const { user, isAdmin, isDirection } = useAuth();

  // Auto-select entity based on user's assigned missions when available
  useEffect(() => {
    if (!user) return;
    // Admin/Direction: keep current selection
    if (isAdmin() || isDirection()) return;
    const missions: string[] = [];
    const push = (v?: any) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach((x) => push(x));
      else missions.push(String(v));
    };
    push(user.assignedMissions);
    push(user.customClaims?.missions);
    if (Array.isArray((user as any).missions)) {
      (user as any).missions.forEach((m: any) => push(m?.name));
    }
    const lower = missions.map((m) => m.toLowerCase());
    const hasCiv = lower.some((m) => m.includes("civ"));
    const hasCanal = lower.some((m) => m.includes("canal"));
    if (hasCiv) setEntity("canal-civ");
    else if (hasCanal) setEntity("canal-fr");
    // else keep previous (e.g., leads)
  }, [user]);

  const value = useMemo(() => ({ entity, setEntity }), [entity]);
  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
};
