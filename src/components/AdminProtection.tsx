import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface AdminProtectionProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "direction" | "superviseur";
  missionId?: string;
}

const AdminProtection: React.FC<AdminProtectionProps> = ({
  children,
  requiredRole = "superviseur",
  missionId,
}) => {
  const {
    user,
    loading,
    isAdmin,
    isDirection,
    isSuperviseur,
    isTA,
    canAccessMission,
  } = useAuth();

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Rediriger vers login si pas connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Bloquer uniquement les TAs "purs" (sans rôle supérieur). Un superviseur avec flag TA doit passer.
  const isPureTA = isTA() && !isAdmin() && !isDirection() && !isSuperviseur();
  if (isPureTA) {
    return <Navigate to="/access-denied" replace />;
  }

  // Vérifier les permissions selon le rôle requis
  let hasAccess = false;

  switch (requiredRole) {
    case "admin":
      hasAccess = isAdmin();
      break;
    case "direction":
      hasAccess = isAdmin() || isDirection();
      break;
    case "superviseur":
      hasAccess = isAdmin() || isDirection() || isSuperviseur();
      break;
  }

  // Pour les superviseurs, vérifier l'accès à la mission spécifique
  if (hasAccess && missionId && isSuperviseur()) {
    hasAccess = canAccessMission(missionId);
  }

  console.log("User permissions:", {
    isAdmin: isAdmin(),
    isDirection: isDirection(),
    isSuperviseur: isSuperviseur(),
    isTA: isTA(),
    canAccessMission: missionId ? canAccessMission(missionId) : true,
  });

  // Rediriger vers la page d'accès refusé si pas les bonnes permissions
  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  // Afficher la page si l'utilisateur a les bonnes permissions
  return <>{children}</>;
};

export default AdminProtection;
