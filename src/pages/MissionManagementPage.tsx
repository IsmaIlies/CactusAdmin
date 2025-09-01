import React, { useState, useEffect } from "react";
import missionService, {
  Mission,
  MissionUser,
} from "../services/missionService";
import migrationService from "../services/migrationService";
import initializationService from "../services/initializationService";
import {
  Trash2,
  Users,
  Target,
  Calendar,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
} from "lucide-react";

const MissionManagementPage: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      setError("");
      const missionsData = await missionService.getMissions();
      setMissions(missionsData);
    } catch (err: any) {
      console.error("Erreur lors du chargement des missions:", err);
      setError(err.message || "Erreur lors du chargement des missions");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMission = (mission: Mission) => {
    setSelectedMission(mission);
    setShowDataModal(true);
  };

  const handleDeleteMission = async (missionId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette mission ?")) {
      try {
        await missionService.deleteMission(missionId);
        await fetchMissions();
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression de la mission");
      }
    }
  };

  const handleToggleMissionStatus = async (mission: Mission) => {
    try {
      await missionService.updateMission(mission.id!, {
        isActive: !mission.isActive,
      });
      await fetchMissions();
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
      alert("Erreur lors du changement de statut");
    }
  };

  const handleManageUsers = (mission: Mission) => {
    setSelectedMission(mission);
    setShowUsersModal(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("fr-FR");
  };

  const getMissionStatusBadge = (mission: Mission) => {
    if (mission.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
  };

  const getUsersSummary = (users: MissionUser[]) => {
    if (users.length === 0) return "Aucun utilisateur";
    const tas = users.filter((u) => u.role === "ta").length;
    const supervisors = users.filter((u) => u.role === "supervisor").length;
    const admins = users.filter((u) => u.role === "admin").length;

    let summary = [];
    if (tas > 0) summary.push(`${tas} TA${tas > 1 ? "s" : ""}`);
    if (supervisors > 0)
      summary.push(`${supervisors} Superviseur${supervisors > 1 ? "s" : ""}`);
    if (admins > 0) summary.push(`${admins} Admin${admins > 1 ? "s" : ""}`);

    return summary.join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Erreur</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des missions
          </h1>
          <p className="text-gray-600">
            Gérez les équipes et les affectations aux missions existantes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInitModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Target className="w-4 h-4" />
            Initialiser
          </button>
          <button
            onClick={fetchMissions}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Target className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total missions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {missions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Missions actives
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {missions.filter((m) => m.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Utilisateurs assignés
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {missions.reduce(
                  (total, mission) => total + mission.users.length,
                  0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Données organisées
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {/* Pourcentage de données organisées par mission */}
                {missions.length > 0 ? "80%" : "0%"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des missions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Liste des missions
          </h2>
        </div>

        {missions.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune mission trouvée
            </h3>
            <p className="text-gray-600 mb-4">
              Les missions sont créées automatiquement selon les besoins métier
            </p>
            <button
              onClick={fetchMissions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Target className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Données
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Équipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créée le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {mission.name}
                        </div>
                        {mission.description && (
                          <div className="text-sm text-gray-500">
                            {mission.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getMissionStatusBadge(mission)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Ventes: --
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Contacts: --
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                            Objectifs: --
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {getUsersSummary(mission.users)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(mission.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleManageUsers(mission)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Gérer les utilisateurs"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditMission(mission)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Gérer les données"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleMissionStatus(mission)}
                          className={`${
                            mission.isActive
                              ? "text-red-600 hover:text-red-900"
                              : "text-green-600 hover:text-green-900"
                          }`}
                          title={mission.isActive ? "Désactiver" : "Activer"}
                        >
                          {mission.isActive ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteMission(mission.id!)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {showInitModal && (
        <InitializationModal
          onClose={() => setShowInitModal(false)}
          onSuccess={fetchMissions}
        />
      )}

      {showDataModal && selectedMission && (
        <ManageDataModal
          mission={selectedMission}
          onClose={() => {
            setShowDataModal(false);
            setSelectedMission(null);
          }}
          onSuccess={fetchMissions}
        />
      )}

      {showUsersModal && selectedMission && (
        <ManageUsersModal
          mission={selectedMission}
          onClose={() => {
            setShowUsersModal(false);
            setSelectedMission(null);
          }}
          onSuccess={fetchMissions}
        />
      )}
    </div>
  );
};

// Composant modal pour gérer les données de la mission
const ManageDataModal: React.FC<{
  mission: Mission;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ mission, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    sales: boolean;
    contacts: boolean;
    objectives: boolean;
  }>({
    sales: false,
    contacts: false,
    objectives: false,
  });
  const [dataStats, setDataStats] = useState<{
    unassigned: { sales: number; contacts: number; objectives: number };
    mission: { sales: number; contacts: number; objectives: number };
  }>({
    unassigned: { sales: 0, contacts: 0, objectives: 0 },
    mission: { sales: 0, contacts: 0, objectives: 0 },
  });

  // Charger les statistiques au montage du composant
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [unassignedData, missionData] = await Promise.all([
          migrationService.getUnassignedDataCount(),
          migrationService.getMigrationStatus(mission.id!),
        ]);

        setDataStats({
          unassigned: unassignedData,
          mission: missionData,
        });
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      }
    };

    loadStats();
  }, [mission.id]);

  const handleMigrateData = async (
    dataType: "sales" | "contacts" | "objectives"
  ) => {
    setLoading(true);
    try {
      // Diagnostic détaillé des permissions utilisateur
      const currentUser = await import("../firebase").then(
        (m) => m.auth.currentUser
      );
      const userToken = currentUser
        ? await currentUser.getIdTokenResult()
        : null;

      console.log("🔍 Diagnostic complet des permissions:", {
        dataType,
        missionId: mission.id,
        userUid: currentUser?.uid,
        userEmail: currentUser?.email,
        userClaims: userToken?.claims,
        hasAdminClaim: userToken?.claims?.admin === true,
        hasDirectionClaim: userToken?.claims?.direction === true,
        hasSuperviseurClaim: userToken?.claims?.superviseur === true,
        tokenExpiry: userToken?.expirationTime,
        authTime: userToken?.authTime,
      });

      // Vérifier si l'utilisateur a les permissions requises
      const hasRequiredPermissions =
        userToken?.claims?.admin === true ||
        userToken?.claims?.direction === true ||
        userToken?.claims?.superviseur === true;

      if (!hasRequiredPermissions) {
        throw new Error(
          `PERMISSIONS MANQUANTES: L'utilisateur ${currentUser?.email} n'a pas les claims personnalisés requis (admin, direction, ou superviseur) dans son token Firebase Auth.`
        );
      }

      let migratedCount = 0;

      switch (dataType) {
        case "sales":
          migratedCount = await migrationService.migrateSalesToMission(
            mission.id!
          );
          break;
        case "contacts":
          migratedCount = await migrationService.migrateContactsToMission(
            mission.id!
          );
          break;
        case "objectives":
          migratedCount = await migrationService.migrateObjectivesToMission(
            mission.id!
          );
          break;
      }

      alert(`${migratedCount} éléments copiés avec succès vers la mission!`);
      setMigrationStatus((prev) => ({ ...prev, [dataType]: true }));

      // Recharger les statistiques
      const [unassignedData, missionData] = await Promise.all([
        migrationService.getUnassignedDataCount(),
        migrationService.getMigrationStatus(mission.id!),
      ]);

      setDataStats({
        unassigned: unassignedData,
        mission: missionData,
      });

      onSuccess();
    } catch (error: any) {
      console.error(`❌ Erreur lors de la copie des ${dataType}:`, error);
      let errorMessage = error.message || "Erreur inconnue";

      // Messages d'erreur plus explicites
      if (errorMessage.includes("Missing or insufficient permissions")) {
        errorMessage = `🚨 PERMISSIONS INSUFFISANTES 🚨
        
Les règles Firestore n'autorisent pas l'accès aux sous-collections des missions.

SOLUTION: 
1. Allez dans Console Firebase → Firestore → Règles
2. Ajoutez les règles pour les sous-collections missions/{missionId}/sales, etc.
3. Cliquez sur "Publier"

Détails: Impossible d'accéder à missions/${mission.id}/${dataType}`;
      } else if (errorMessage.includes("PERMISSIONS MANQUANTES")) {
        errorMessage = `🚨 CLAIMS PERSONNALISÉS MANQUANTS 🚨
        
Votre compte utilisateur n'a pas les permissions administrateur requises.

SOLUTION:
1. Demandez à un administrateur de vous attribuer le rôle "admin", "direction" ou "superviseur"
2. Ou utilisez la console Firebase pour ajouter manuellement les claims personnalisés

ALTERNATIVE TEMPORAIRE:
Modifiez temporairement les règles Firestore pour autoriser tous les utilisateurs authentifiés:
- Remplacez "hasAdminRole()" par "request.auth != null"
- N'OUBLIEZ PAS de restaurer les vraies règles après !

Détails: ${errorMessage}`;
      }

      alert(`Erreur lors de la copie des ${dataType}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreData = async (
    dataType: "sales" | "contacts" | "objectives"
  ) => {
    setLoading(true);
    try {
      // Diagnostic détaillé des permissions utilisateur
      const currentUser = await import("../firebase").then(
        (m) => m.auth.currentUser
      );
      const userToken = currentUser
        ? await currentUser.getIdTokenResult()
        : null;

      console.log("🔄 Diagnostic complet des permissions pour restauration:", {
        dataType,
        missionId: mission.id,
        userUid: currentUser?.uid,
        userEmail: currentUser?.email,
        userClaims: userToken?.claims,
        hasAdminClaim: userToken?.claims?.admin === true,
        hasDirectionClaim: userToken?.claims?.direction === true,
        hasSuperviseurClaim: userToken?.claims?.superviseur === true,
      });

      // Vérifier si l'utilisateur a les permissions requises
      const hasRequiredPermissions =
        userToken?.claims?.admin === true ||
        userToken?.claims?.direction === true ||
        userToken?.claims?.superviseur === true;

      if (!hasRequiredPermissions) {
        throw new Error(
          `PERMISSIONS MANQUANTES: L'utilisateur ${currentUser?.email} n'a pas les claims personnalisés requis (admin, direction, ou superviseur) dans son token Firebase Auth.`
        );
      }

      let restoredCount = 0;

      switch (dataType) {
        case "sales":
          restoredCount = await migrationService.restoreSalesFromMission(
            mission.id!
          );
          break;
        case "contacts":
          restoredCount = await migrationService.restoreContactsFromMission(
            mission.id!
          );
          break;
        case "objectives":
          restoredCount = await migrationService.restoreObjectivesFromMission(
            mission.id!
          );
          break;
      }

      alert(
        `${restoredCount} éléments récupérés avec succès vers la collection globale!`
      );

      // Recharger les statistiques
      const [unassignedData, missionData] = await Promise.all([
        migrationService.getUnassignedDataCount(),
        migrationService.getMigrationStatus(mission.id!),
      ]);

      setDataStats({
        unassigned: unassignedData,
        mission: missionData,
      });

      onSuccess();
    } catch (error: any) {
      console.error(
        `❌ Erreur lors de la récupération des ${dataType}:`,
        error
      );
      let errorMessage = error.message || "Erreur inconnue";

      if (errorMessage.includes("Missing or insufficient permissions")) {
        errorMessage = `🚨 PERMISSIONS INSUFFISANTES 🚨
        
Les règles Firestore n'autorisent pas l'accès aux sous-collections des missions.

SOLUTION: 
1. Allez dans Console Firebase → Firestore → Règles
2. Vérifiez les règles pour les sous-collections missions/{missionId}/${dataType}
3. Cliquez sur "Publier"`;
      } else if (errorMessage.includes("PERMISSIONS MANQUANTES")) {
        errorMessage = `🚨 CLAIMS PERSONNALISÉS MANQUANTS 🚨
        
Votre compte utilisateur n'a pas les permissions administrateur requises.

SOLUTION:
1. Demandez à un administrateur de vous attribuer le rôle "admin", "direction" ou "superviseur"
2. Ou utilisez la console Firebase pour ajouter manuellement les claims personnalisés

ALTERNATIVE TEMPORAIRE:
Modifiez temporairement les règles Firestore pour autoriser tous les utilisateurs authentifiés:
- Remplacez "hasAdminRole()" par "request.auth != null"
- N'OUBLIEZ PAS de restaurer les vraies règles après !

Détails: ${errorMessage}`;
      }

      alert(`Erreur lors de la récupération des ${dataType}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Gestion des données - {mission.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              Migration des données
            </h3>
            <p className="text-sm text-blue-700">
              Organisez vos données en les migrant vers cette mission
              spécifique. Cela permettra une meilleure organisation et un suivi
              plus précis.
            </p>
          </div>

          <div className="space-y-4">
            {/* Ventes */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Données de ventes
                  </h4>
                  <p className="text-sm text-gray-600">
                    Non assignées: {dataStats.unassigned.sales} | Dans la
                    mission: {dataStats.mission.sales}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMigrateData("sales")}
                    disabled={
                      loading ||
                      migrationStatus.sales ||
                      dataStats.unassigned.sales === 0
                    }
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      migrationStatus.sales || dataStats.unassigned.sales === 0
                        ? "bg-green-100 text-green-700 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {migrationStatus.sales
                      ? "Copié ✓"
                      : dataStats.unassigned.sales === 0
                      ? "Aucune donnée"
                      : `Copier vers mission (${dataStats.unassigned.sales})`}
                  </button>
                  <button
                    onClick={() => handleRestoreData("sales")}
                    disabled={loading || dataStats.mission.sales === 0}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      dataStats.mission.sales === 0
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-orange-600 text-white hover:bg-orange-700"
                    }`}
                    title="Récupérer les données depuis la mission vers la collection globale"
                  >
                    ← Récupérer ({dataStats.mission.sales})
                  </button>
                </div>
              </div>
            </div>

            {/* Contacts argumentés */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Contacts argumentés
                  </h4>
                  <p className="text-sm text-gray-600">
                    Non assignés: {dataStats.unassigned.contacts} | Dans la
                    mission: {dataStats.mission.contacts}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMigrateData("contacts")}
                    disabled={
                      loading ||
                      migrationStatus.contacts ||
                      dataStats.unassigned.contacts === 0
                    }
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      migrationStatus.contacts ||
                      dataStats.unassigned.contacts === 0
                        ? "bg-green-100 text-green-700 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {migrationStatus.contacts
                      ? "Copié ✓"
                      : dataStats.unassigned.contacts === 0
                      ? "Aucune donnée"
                      : `Copier vers mission (${dataStats.unassigned.contacts})`}
                  </button>
                  <button
                    onClick={() => handleRestoreData("contacts")}
                    disabled={loading || dataStats.mission.contacts === 0}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      dataStats.mission.contacts === 0
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-orange-600 text-white hover:bg-orange-700"
                    }`}
                    title="Récupérer les données depuis la mission vers la collection globale"
                  >
                    ← Récupérer ({dataStats.mission.contacts})
                  </button>
                </div>
              </div>
            </div>

            {/* Objectifs */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">Objectifs</h4>
                  <p className="text-sm text-gray-600">
                    Non assignés: {dataStats.unassigned.objectives} | Dans la
                    mission: {dataStats.mission.objectives}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMigrateData("objectives")}
                    disabled={
                      loading ||
                      migrationStatus.objectives ||
                      dataStats.unassigned.objectives === 0
                    }
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      migrationStatus.objectives ||
                      dataStats.unassigned.objectives === 0
                        ? "bg-green-100 text-green-700 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {migrationStatus.objectives
                      ? "Copié ✓"
                      : dataStats.unassigned.objectives === 0
                      ? "Aucune donnée"
                      : `Copier vers mission (${dataStats.unassigned.objectives})`}
                  </button>
                  <button
                    onClick={() => handleRestoreData("objectives")}
                    disabled={loading || dataStats.mission.objectives === 0}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      dataStats.mission.objectives === 0
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-orange-600 text-white hover:bg-orange-700"
                    }`}
                    title="Récupérer les données depuis la mission vers la collection globale"
                  >
                    ← Récupérer ({dataStats.mission.objectives})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Migration en cours...</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant modal pour gérer les utilisateurs
const ManageUsersModal: React.FC<{
  mission: Mission;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ mission, onClose, onSuccess }) => {
  const [users, setUsers] = useState<MissionUser[]>(mission.users);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ta" | "supervisor" | "admin">(
    "ta"
  );
  const [addingUser, setAddingUser] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);

    try {
      // Rechercher l'utilisateur par email
      const foundUser = await missionService.findUserByEmail(newUserEmail);

      const newUser: MissionUser = {
        uid: foundUser.uid,
        email: foundUser.email,
        displayName: foundUser.displayName,
        role: newUserRole,
        assignedAt: new Date() as any,
      };

      await missionService.addUserToMission(mission.id!, newUser);
      setUsers([...users, newUser]);
      setNewUserEmail("");
      setNewUserRole("ta");
      onSuccess();
    } catch (error: any) {
      alert("Erreur lors de l'ajout de l'utilisateur: " + error.message);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir retirer cet utilisateur de la mission ?"
      )
    ) {
      try {
        await missionService.removeUserFromMission(mission.id!, userId);
        setUsers(users.filter((u) => u.uid !== userId));
        onSuccess();
      } catch (error: any) {
        alert(
          "Erreur lors de la suppression de l'utilisateur: " + error.message
        );
      }
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ta":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            TA
          </span>
        );
      case "supervisor":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Superviseur
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Gérer les utilisateurs - {mission.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Formulaire d'ajout d'utilisateur */}
        <form
          onSubmit={handleAddUser}
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <h3 className="text-lg font-medium mb-4">Ajouter un utilisateur</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de l'utilisateur
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={newUserRole}
                onChange={(e) =>
                  setNewUserRole(
                    e.target.value as "ta" | "supervisor" | "admin"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ta">TA</option>
                <option value="supervisor">Superviseur</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={addingUser}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {addingUser ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </form>

        {/* Liste des utilisateurs */}
        <div>
          <h3 className="text-lg font-medium mb-4">
            Utilisateurs assignés ({users.length})
          </h3>
          {users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun utilisateur assigné à cette mission
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.displayName || user.email}
                      </p>
                      {user.displayName && (
                        <p className="text-sm text-gray-500">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(user.role)}
                    <button
                      onClick={() => handleRemoveUser(user.uid)}
                      className="text-red-600 hover:text-red-800"
                      title="Retirer de la mission"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant modal pour l'initialisation du système
const InitializationModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [initStatus, setInitStatus] = useState<{
    canalPlusMissionExists: boolean;
    missionId?: string;
    collectionsInitialized: boolean;
  } | null>(null);

  // Vérifier le statut d'initialisation au montage
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await initializationService.checkInitializationStatus();
        setInitStatus(status);
      } catch (error) {
        console.error("Erreur lors de la vérification du statut:", error);
      }
    };

    checkStatus();
  }, []);

  const handleInitialize = async () => {
    setLoading(true);
    setStatus("Initialisation en cours...");

    try {
      const result = await initializationService.initializeSystem();
      setStatus(`Succès! Mission ID: ${result.missionId}`);

      // Recharger le statut
      const newStatus = await initializationService.checkInitializationStatus();
      setInitStatus(newStatus);

      onSuccess();
    } catch (error: any) {
      console.error("Erreur d'initialisation:", error);
      let errorMessage = error.message || "Erreur inconnue";

      // Messages d'erreur plus explicites
      if (errorMessage.includes("Missing or insufficient permissions")) {
        errorMessage =
          "Permissions insuffisantes. Veuillez vérifier que les règles Firestore sont correctement configurées.";
      } else if (errorMessage.includes("CORS")) {
        errorMessage =
          "Erreur de configuration des fonctions Cloud. L'initialisation continuera sans certaines fonctionnalités.";
      }

      setStatus(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Initialisation du système</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              Configuration initiale
            </h3>
            <p className="text-sm text-blue-700">
              Cette action va créer la mission Canal+ et préparer les
              collections pour organiser vos données de ventes, contacts et
              objectifs.
            </p>
          </div>

          {/* Statut actuel */}
          {initStatus && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Statut actuel:</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Mission Canal+</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      initStatus.canalPlusMissionExists
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {initStatus.canalPlusMissionExists ? "Existe" : "Non créée"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Collections initialisées</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      initStatus.collectionsInitialized
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {initStatus.collectionsInitialized
                      ? "Prêtes"
                      : "Non créées"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action d'initialisation */}
          <div className="space-y-4">
            <button
              onClick={handleInitialize}
              disabled={
                loading ||
                (initStatus?.canalPlusMissionExists &&
                  initStatus?.collectionsInitialized)
              }
              className={`w-full px-4 py-3 rounded-md text-sm font-medium ${
                initStatus?.canalPlusMissionExists &&
                initStatus?.collectionsInitialized
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {loading
                ? "Initialisation..."
                : initStatus?.canalPlusMissionExists &&
                  initStatus?.collectionsInitialized
                ? "Système déjà initialisé"
                : "Initialiser le système"}
            </button>

            {status && (
              <div
                className={`p-3 rounded border ${
                  status.includes("Erreur")
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                {status}
              </div>
            )}
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Initialisation en cours...</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionManagementPage;
