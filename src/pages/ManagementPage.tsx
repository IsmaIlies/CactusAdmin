import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import objectiveService, { Objective } from "../services/objectiveService";
import salesService from "../services/salesService";
import ObjectiveModal from "../components/ObjectiveModal";
import { Target, XCircle, Edit, Plus, TrendingUp, Award } from "lucide-react";

interface ObjectiveWithProgress extends Objective {
  currentCount?: number;
  progressPercentage?: number;
  remainingDays?: number;
}

const ManagementPage: React.FC = () => {
  const { isAdmin, isDirection, isSuperviseur, user } = useAuth();
  const [teamObjectives, setTeamObjectives] = useState<ObjectiveWithProgress[]>(
    []
  );
  const [personalObjectives, setPersonalObjectives] = useState<
    ObjectiveWithProgress[]
  >([]);
  const [activeTab, setActiveTab] = useState<"team" | "personal">("team");
  const [objectivesLoading, setObjectivesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);

  // États pour les modales
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(
    null
  );

  useEffect(() => {
    const fetchObjectives = async () => {
      if (!user?.id) return;

      try {
        setObjectivesLoading(true);
        // Récupérer les objectifs d'équipe et personnels
        const { team, personal } =
          await objectiveService.getAllObjectivesForUser(user.id);
        console.log("[ManagementPage] user.id:", user.id);
        console.log("[ManagementPage] Objectifs récupérés:", { team, personal });

        // Charger les données de progression pour chaque objectif
        await Promise.all([
          loadObjectivesProgress(team, "team"),
          loadObjectivesProgress(personal, "personal"),
        ]);
      } catch (error) {
        console.error("Erreur lors de la récupération des objectifs:", error);
      } finally {
        setObjectivesLoading(false);
        setLoading(false);
      }
    };

    fetchObjectives();
  }, [user]);

  const refreshObjectives = async () => {
    if (!user?.id) return;

    try {
      setObjectivesLoading(true);
      const { team, personal } = await objectiveService.getAllObjectivesForUser(
        user.id
      );
      console.log("Objectifs rafraîchis:", { team, personal });

      // Charger les données de progression pour chaque objectif
      await Promise.all([
        loadObjectivesProgress(team, "team"),
        loadObjectivesProgress(personal, "personal"),
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des objectifs:", error);
    } finally {
      setObjectivesLoading(false);
    }
  };

  const handleAddObjective = () => {
    setEditingObjective(null);
    setShowObjectiveModal(true);
  };

  const handleEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    setShowObjectiveModal(true);
  };

  const handleDeleteObjective = async (objectiveId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?"))
      return;

    try {
      await objectiveService.deleteObjective(objectiveId);
      await refreshObjectives();
    } catch (error) {
      console.error("Erreur lors de la suppression de l'objectif:", error);
      alert("Erreur lors de la suppression de l'objectif");
    }
  };

  const handleSaveObjective = async (
    objectiveData: Omit<Objective, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      // Ajout des champs nécessaires pour la vérification
      const dataToCheck = {
        ...objectiveData,
        id: editingObjective?.id,
        scope: objectiveData.scope,
        assignedTo: objectiveData.scope === "personal" ? (objectiveData.assignedTo || user?.id) : undefined,
      };
      // Vérifier si un objectif similaire existe déjà pour la même personne et la même période
      const objectiveExists = await objectiveService.checkObjectiveExists(dataToCheck);

      if (objectiveExists) {
        alert(
          `Un objectif similaire existe déjà pour cette ${
            objectiveData.period === "month" ? "période mensuelle" : "semaine"
          }.`
        );
        return;
      }

      // Ajout du userId uniquement pour les objectifs personnels
      let dataToSave = { ...objectiveData };
      if (objectiveData.scope === "personal") {
        dataToSave.userId = objectiveData.assignedTo || user?.id;
      } else {
        // S'assurer que userId n'est pas présent du tout pour les objectifs d'équipe
        if ('userId' in dataToSave) {
          delete dataToSave.userId;
        }
      }
      // Supprimer assignedTo si undefined
      if (typeof dataToSave.assignedTo === 'undefined') {
        delete dataToSave.assignedTo;
      }
      // Supprimer assignedToName si undefined
      if (typeof dataToSave.assignedToName === 'undefined') {
        delete dataToSave.assignedToName;
      }

      if (editingObjective) {
        await objectiveService.updateObjective(
          editingObjective.id!,
          dataToSave
        );
      } else {
        await objectiveService.createObjective(dataToSave);
      }
      setShowObjectiveModal(false);
      setEditingObjective(null);
      await refreshObjectives();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'objectif:", error);
      alert("Erreur lors de la sauvegarde de l'objectif");
    }
  };

  const canEditObjectives = () => {
    return isAdmin() || isDirection() || isSuperviseur();
  };

  // Fonction pour charger les données de progression pour chaque objectif
  const loadObjectivesProgress = async (
    objectivesList: Objective[],
    type: "team" | "personal"
  ) => {
    setProgressLoading(true);
    try {
      const objectivesWithProgress: ObjectiveWithProgress[] = [];

      for (const objective of objectivesList) {
        console.log("Traitement de l'objectif:", objective.label, {
          period: objective.period,
          year: objective.year,
          month: objective.month,
          weekYear: objective.weekYear,
          weekNumber: objective.weekNumber,
        });

        // Récupérer le nombre de ventes pour cet objectif
        const periodData: any = {
          year: objective.year,
          month: objective.month,
          weekYear: objective.weekYear,
          weekNumber: objective.weekNumber,
          dayYear: objective.dayYear,
          dayMonth: objective.dayMonth,
          dayDate: objective.dayDate,
        };

        // Pour les objectifs hebdomadaires, filtrer par le mois en cours
        if (
          objective.period === "week" &&
          objective.weekYear &&
          objective.weekNumber
        ) {
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1; // Mois en cours (1-12)

          // Ajouter le filtre du mois en cours pour les objectifs hebdomadaires
          periodData.monthFilter = currentMonth;

          console.log("Objectif hebdomadaire - filtrage par mois en cours:", {
            semaine: objective.weekNumber,
            année: objective.weekYear,
            moisFiltre: currentMonth,
          });
        }

        // Filtrer par userId pour les objectifs personnels
        let count = 0;
        if (objective.scope === "personal") {
          const assignedUserId = objective.userId || objective.assignedTo;
          const debugPeriodData = { ...periodData, userId: assignedUserId };
          console.log("[DEBUG] Calcul ventes perso:", {
            label: objective.label,
            assignedUserId,
            debugPeriodData
          });
          count = await salesService.getSalesCountForPeriod(
            objective.period,
            debugPeriodData
          );
          console.log(`[DEBUG] Résultat getSalesCountForPeriod pour ${objective.label}:`, count);
        } else {
          console.log("[DEBUG] Calcul ventes équipe:", {
            label: objective.label,
            periodData
          });
          count = await salesService.getSalesCountForPeriod(
            objective.period,
            periodData
          );
          console.log(`[DEBUG] Résultat getSalesCountForPeriod pour ${objective.label}:`, count);
        }

        // Calculer le pourcentage de progression
        const progressPercentage = objectiveService.calculateProgressPercentage(
          objective,
          count
        );

        // Calculer les jours travaillés restants
        const remainingDays =
          objectiveService.calculateRemainingDays(objective);

        console.log("Progression calculée pour", objective.label, ":", {
          count,
          progressPercentage,
          remainingDays,
        });

        objectivesWithProgress.push({
          ...objective,
          currentCount: count,
          progressPercentage,
          remainingDays,
        });
      }

      if (type === "team") {
        setTeamObjectives(objectivesWithProgress);
      } else {
        setPersonalObjectives(objectivesWithProgress);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des progressions:", error);
    } finally {
      setProgressLoading(false);
    }
  };

  // Calculer les objectifs actifs selon l'onglet
  const currentObjectives =
    activeTab === "team" ? teamObjectives : personalObjectives;
  const allObjectives = [...teamObjectives, ...personalObjectives];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Management</h1>
            </div>
            <p className="text-gray-600 mb-4">
              Gestion des objectifs et performances
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progression</p>
              {progressLoading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {allObjectives.filter(
                    (obj: ObjectiveWithProgress) =>
                      obj.period === "month" &&
                      obj.currentCount !== undefined &&
                      obj.target
                  ).length > 0
                    ? Math.round(
                        allObjectives
                          .filter(
                            (obj: ObjectiveWithProgress) =>
                              obj.period === "month"
                          )
                          .reduce(
                            (acc: number, obj: ObjectiveWithProgress) =>
                              acc + (obj.progressPercentage || 0),
                            0
                          ) /
                          allObjectives.filter(
                            (obj: ObjectiveWithProgress) =>
                              obj.period === "month"
                          ).length
                      ) + "%"
                    : "--"}
                </p>
              )}
              <p className="text-xs text-gray-500">Ce mois</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Objectifs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Objectifs</h2>
              {canEditObjectives() && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAddObjective}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-green-600 hover:text-green-800"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
              )}
            </div>

            {/* Onglets */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("team")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "team"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Équipe ({teamObjectives.length})
              </button>
              <button
                onClick={() => setActiveTab("personal")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "personal"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Personnel ({personalObjectives.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {objectivesLoading || progressLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-4">
                  Chargement des objectifs...
                </p>
              </div>
            ) : currentObjectives.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun objectif{" "}
                  {activeTab === "team" ? "d'équipe" : "personnel"}
                </h3>
                <p className="text-gray-600 mb-4">
                  Aucun objectif{" "}
                  {activeTab === "team" ? "d'équipe" : "personnel"} n'a été
                  défini
                </p>
                {canEditObjectives() && (
                  <button
                    onClick={handleAddObjective}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un objectif
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {currentObjectives.map(
                  (objective: ObjectiveWithProgress, index: number) => (
                    <div
                      key={objective.id || index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {objective.label}
                          </h4>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {objective.type === "sales"
                              ? "Ventes"
                              : objective.type === "contactsArgues"
                              ? "Contacts argumentés"
                              : "Autre"}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              objective.scope === "team"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {objective.scope === "team"
                              ? "Équipe"
                              : "Personnel"}
                          </span>
                          {objective.scope === "personal" &&
                            objective.assignedToName && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                {objective.assignedToName}
                              </span>
                            )}
                        </div>
                        {canEditObjectives() && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditObjective(objective)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Modifier l'objectif"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteObjective(objective.id!)
                              }
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Supprimer l'objectif"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <div className="text-gray-500">
                          {objectiveService.formatObjectivePeriod(objective)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Objectif:</span>
                          <span className="font-medium text-lg">
                            {objective.target}
                          </span>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div
                          className={`h-2.5 rounded-full ${
                            (objective.progressPercentage || 0) >= 100
                              ? "bg-green-600"
                              : (objective.progressPercentage || 0) >= 50
                              ? "bg-blue-600"
                              : "bg-yellow-400"
                          }`}
                          style={{
                            width: `${Math.min(
                              objective.progressPercentage || 0,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>

                      {/* Statistiques de progression */}
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Ventes:</span>
                          <span className="font-medium">
                            {objective.currentCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Progression:</span>
                          <span
                            className={`font-medium ${
                              (objective.progressPercentage || 0) >= 100
                                ? "text-green-600"
                                : (objective.progressPercentage || 0) >= 50
                                ? "text-blue-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {objective.progressPercentage || 0}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">
                            Jours travaillés restant:
                          </span>
                          <span className="font-medium">
                            {objective.remainingDays || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale d'ajout/édition d'objectif */}
      {showObjectiveModal && (
        <ObjectiveModal
          objective={editingObjective}
          onSave={handleSaveObjective}
          onClose={() => {
            setShowObjectiveModal(false);
            setEditingObjective(null);
          }}
          currentUserId={user?.id || ""}
          canCreateTeamObjectives={canEditObjectives()}
        />
      )}
    </div>
  );
};

export default ManagementPage;
