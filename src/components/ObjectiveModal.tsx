import React, { useState, useEffect } from "react";
import { Objective } from "../services/objectiveService";
import objectiveService from "../services/objectiveService";
import userService, { FirebaseUser } from "../services/userService";
import { X, Calendar, Target, User } from "lucide-react";
import { getWeekNumber, getWeekDates } from "../utils/dateUtils";

interface ObjectiveModalProps {
  objective?: Objective | null;
  onSave: (
    objectiveData: Omit<Objective, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  onClose: () => void;
  currentUserId: string;
  canCreateTeamObjectives: boolean;
}

const ObjectiveModal: React.FC<ObjectiveModalProps> = ({
  objective,
  onSave,
  onClose,
  currentUserId,
  canCreateTeamObjectives,
}) => {
  const [formData, setFormData] = useState({
    type: "sales" as "sales" | "contactsArgues" | "other",
    label: "",
    target: "" as string | number, // Permettre une chaîne vide ou un nombre
    period: "month" as "month" | "week" | "day",
    scope: "personal" as "team" | "personal",
    assignedTo: "" as string,
    assignedToName: "" as string,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    weekYear: new Date().getFullYear(),
    weekNumber: 1,
    isActive: true,
    createdBy: "user",
    missionId: null as string | null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (objective) {
      setFormData({
        type: objective.type,
        label: objective.label,
        target: objective.target,
        period: objective.period,
        scope: objective.scope || "personal",
        assignedTo: objective.assignedTo || "",
        assignedToName: objective.assignedToName || "",
        year: objective.year || new Date().getFullYear(),
        month: objective.month || new Date().getMonth() + 1,
        day: objective.dayDate || new Date().getDate(),
        weekYear: objective.weekYear || new Date().getFullYear(),
        weekNumber: objective.weekNumber || 1,
        isActive: objective.isActive,
        createdBy: objective.createdBy,
        missionId: objective.missionId || null,
      });
    }
  }, [objective]);

  // Calculer le numéro de semaine actuel au chargement
  useEffect(() => {
    if (!objective) {
      const { week } = getWeekNumber(new Date());
      setFormData((prev) => ({ ...prev, weekNumber: week }));
    }
  }, [objective]);

  // Charger les utilisateurs au montage du composant
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const usersList = await userService.getUsers();
        setUsers(usersList);
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  // Fonction pour obtenir les dates de début et fin d'une semaine
  const getWeekPeriod = (year: number, weekNumber: number) => {
    try {
      const { startDate, endDate } = getWeekDates(year, weekNumber);
      const formatDate = (date: Date) => {
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        });
      };
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } catch (error) {
      return "";
    }
  };

  // Fonction pour gérer le changement d'utilisateur assigné
  const handleAssignedUserChange = (userId: string) => {
    const selectedUser = users.find((user) => user.uid === userId);
    setFormData((prev) => ({
      ...prev,
      assignedTo: userId,
      assignedToName: selectedUser ? selectedUser.displayName : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      // Convertir target en nombre si c'est une chaîne
      const targetValue =
        typeof formData.target === "string" && formData.target === ""
          ? 0
          : Number(formData.target);

      // Préparer les données selon le type de période pour la validation
      const objectiveDataForValidation = {
        type: formData.type,
        label: formData.label,
        target: targetValue,
        period: formData.period,
        isActive: formData.isActive,
        createdBy: formData.createdBy,
        missionId: null,
      };

      // Ajouter les champs spécifiques selon le type de période
      if (formData.period === "month") {
        (objectiveDataForValidation as any).year = formData.year;
        (objectiveDataForValidation as any).month = formData.month;
      } else if (formData.period === "week") {
        (objectiveDataForValidation as any).weekYear = formData.weekYear;
        (objectiveDataForValidation as any).weekNumber = formData.weekNumber;
      } else if (formData.period === "day") {
        (objectiveDataForValidation as any).dayYear = formData.year;
        (objectiveDataForValidation as any).dayMonth = formData.month;
        (objectiveDataForValidation as any).dayDate = formData.day;
      }

      // Validation côté client
      const validationErrors = objectiveService.validateObjective(
        objectiveDataForValidation
      );
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      // Préparer les données pour la sauvegarde
      const objectiveData: Omit<Objective, "id" | "createdAt" | "updatedAt"> = {
        type: formData.type,
        label: formData.label,
        target: targetValue,
        period: formData.period,
        scope: formData.scope,
        userId: formData.scope === "personal" ? currentUserId : undefined,
        assignedTo:
          formData.scope === "personal" ? formData.assignedTo : undefined,
        assignedToName:
          formData.scope === "personal" ? formData.assignedToName : undefined,
        isActive: formData.isActive,
        createdBy: formData.createdBy,
        missionId: null, // Toujours mettre à null puisqu'on n'utilise plus le système de missions
      };

      // Ajouter l'ID si on est en mode édition
      if (objective?.id) {
        (objectiveData as any).id = objective.id;
      }

      if (formData.period === "month") {
        objectiveData.year = formData.year;
        objectiveData.month = formData.month;
      } else if (formData.period === "week") {
        objectiveData.weekYear = formData.weekYear;
        objectiveData.weekNumber = formData.weekNumber;
      } else if (formData.period === "day") {
        objectiveData.dayYear = formData.year;
        objectiveData.dayMonth = formData.month;
        objectiveData.dayDate = formData.day;
      }

      // Vérifier si un objectif similaire existe déjà
      const objectiveExists = await objectiveService.checkObjectiveExists(
        objectiveData
      );
      if (objectiveExists) {
        let periodText = "période";
        if (formData.period === "month") periodText = "mois";
        else if (formData.period === "week") periodText = "semaine";
        else if (formData.period === "day") periodText = "jour";

        setErrors([
          `Un objectif similaire existe déjà pour cette ${periodText}.`,
        ]);
        setLoading(false);
        return;
      }

      await onSave(objectiveData);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setErrors(["Erreur lors de la sauvegarde de l'objectif"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {objective ? "Modifier l'objectif" : "Ajouter un objectif"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Type d'objectif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'objectif
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as any,
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="sales">Ventes</option>
              <option value="contactsArgues">Contacts argumentés</option>
              <option value="other">Autre</option>
            </select>
          </div>

          {/* Nom de l'objectif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'objectif
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, label: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Ventes Juillet 2025"
              required
            />
          </div>

          {/* Scope de l'objectif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope de l'objectif
            </label>
            <select
              value={formData.scope}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  scope: e.target.value as "team" | "personal",
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="personal">Personnel</option>
              {canCreateTeamObjectives && <option value="team">Équipe</option>}
            </select>
          </div>

          {/* Sélection d'utilisateur (pour les objectifs personnels) */}
          {formData.scope === "personal" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assigner à
              </label>
              {loadingUsers ? (
                <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                  Chargement des utilisateurs...
                </div>
              ) : (
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleAssignedUserChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, period: "month" }))
                }
                className={`p-3 border rounded-md flex items-center justify-center gap-2 ${
                  formData.period === "month"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Mensuel
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, period: "week" }))
                }
                className={`p-3 border rounded-md flex items-center justify-center gap-2 ${
                  formData.period === "week"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Target className="w-4 h-4" />
                Hebdomadaire
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, period: "day" }))
                }
                className={`p-3 border rounded-md flex items-center justify-center gap-2 ${
                  formData.period === "day"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Journalier
              </button>
            </div>
          </div>

          {/* Objectif mensuel */}
          {formData.period === "month" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        year: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mois
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        month: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {objectiveService.getMonthName(month)}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Objectif hebdomadaire */}
          {formData.period === "week" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année
                  </label>
                  <select
                    value={formData.weekYear}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        weekYear: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de semaine
                  </label>
                  <input
                    type="number"
                    value={formData.weekNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        weekNumber: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="53"
                    placeholder="Ex: 25"
                  />
                </div>
              </div>

              {/* Affichage de la période correspondante */}
              {formData.weekNumber && formData.weekYear && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Période :</strong> Semaine {formData.weekNumber} de{" "}
                    {formData.weekYear}
                    <br />
                    <span className="text-blue-600">
                      {getWeekPeriod(formData.weekYear, formData.weekNumber)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Objectif journalier */}
          {formData.period === "day" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        year: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mois
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        month: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {objectiveService.getMonthName(month)}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jour
                  </label>
                  <input
                    type="number"
                    value={formData.day}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        day: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="31"
                    placeholder="Ex: 15"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Objectif chiffré */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objectif
            </label>
            <input
              type="number"
              value={formData.target}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  target:
                    e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 100"
              min="1"
            />
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Objectif actif
            </label>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Sauvegarde..." : objective ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ObjectiveModal;
