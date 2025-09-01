import React, { useState, useEffect } from "react";
import missionService, {
  Mission,
  MissionUser,
} from "../services/missionService";
import { useAuth } from "../contexts/AuthContext";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Target,
  Calendar,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
} from "lucide-react";

const GestionMissionsPage: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSupervisorsModal, setShowSupervisorsModal] = useState(false);

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

  const handleCreateMission = () => {
    setShowCreateModal(true);
  };

  const handleEditMission = (mission: Mission) => {
    setSelectedMission(mission);
    setShowEditModal(true);
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

  const handleManageSupervisors = (mission: Mission) => {
    setSelectedMission(mission);
    setShowSupervisorsModal(true);
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
            Gérez les missions, objectifs et équipes
          </p>
        </div>
        <button
          onClick={handleCreateMission}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle mission
        </button>
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
                Objectifs totaux
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {/* Objectifs maintenant gérés séparément */}
                --
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
              Aucune mission
            </h3>
            <p className="text-gray-600 mb-4">
              Créez votre première mission pour commencer
            </p>
            <button
              onClick={handleCreateMission}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Créer une mission
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
                    Objectifs
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
                        {/* Objectifs maintenant gérés séparément */}
                        Objectifs dans Management
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
                          onClick={() => handleManageSupervisors(mission)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Gérer les superviseurs"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditMission(mission)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
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
      {showCreateModal && (
        <CreateMissionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchMissions}
        />
      )}

      {showEditModal && selectedMission && (
        <EditMissionModal
          mission={selectedMission}
          onClose={() => {
            setShowEditModal(false);
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

      {showSupervisorsModal && selectedMission && (
        <ManageSupervisorsModal
          mission={selectedMission}
          onClose={() => {
            setShowSupervisorsModal(false);
            setSelectedMission(null);
          }}
          onSuccess={fetchMissions}
        />
      )}
    </div>
  );
};

// Composant modal pour créer une mission
const CreateMissionModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    allowSelfRegistration: false,
    maxUsers: 10,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const missionData = {
        name: formData.name,
        description: formData.description,
        users: [],
        isActive: true,
        createdBy: user?.id || "",
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        allowSelfRegistration: formData.allowSelfRegistration,
        maxUsers: formData.maxUsers,
      };

      const validationErrors = missionService.validateMission(missionData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      await missionService.createMission(missionData);
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors([error.message || "Erreur lors de la création de la mission"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Créer une nouvelle mission</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la mission *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Les objectifs pour cette mission peuvent
              être définis séparément dans la section "Management" après la
              création.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer la mission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant modal pour éditer une mission
const EditMissionModal: React.FC<{
  mission: Mission;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ mission, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: mission.name,
    description: mission.description || "",
    startDate: mission.startDate || "",
    endDate: mission.endDate || "",
    allowSelfRegistration: mission.allowSelfRegistration || false,
    maxUsers: mission.maxUsers || 10,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        allowSelfRegistration: formData.allowSelfRegistration,
        maxUsers: formData.maxUsers,
      };

      const validationErrors = missionService.validateMission(updateData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      await missionService.updateMission(mission.id!, updateData);
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors([
        error.message || "Erreur lors de la mise à jour de la mission",
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Modifier la mission</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la mission *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Modification..." : "Modifier la mission"}
            </button>
          </div>
        </form>
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

// Composant modal pour gérer les superviseurs
const ManageSupervisorsModal: React.FC<{
  mission: Mission;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ mission, onClose, onSuccess }) => {
  const [supervisors, setSupervisors] = useState<MissionUser[]>(
    mission.users.filter((u) => u.role === "supervisor")
  );
  const [newSupervisorEmail, setNewSupervisorEmail] = useState("");
  const [addingSupervisor, setAddingSupervisor] = useState(false);

  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSupervisor(true);

    try {
      const foundUser = await missionService.findUserByEmail(newSupervisorEmail);

      const newSupervisor: MissionUser = {
        uid: foundUser.uid,
        email: foundUser.email,
        displayName: foundUser.displayName,
        role: "supervisor",
        assignedAt: new Date() as any,
      };

      await missionService.addUserToMission(mission.id!, newSupervisor);
      setSupervisors([...supervisors, newSupervisor]);
      setNewSupervisorEmail("");
      onSuccess();
    } catch (error: any) {
      alert("Erreur lors de l'ajout du superviseur: " + error.message);
    } finally {
      setAddingSupervisor(false);
    }
  };

  const handleRemoveSupervisor = async (userId: string) => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir retirer ce superviseur de la mission ?"
      )
    ) {
      try {
        await missionService.removeUserFromMission(mission.id!, userId);
        setSupervisors(supervisors.filter((u) => u.uid !== userId));
        onSuccess();
      } catch (error: any) {
        alert("Erreur lors de la suppression du superviseur: " + error.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Gérer les superviseurs - {mission.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {/* Formulaire d'ajout de superviseur */}
        <form
          onSubmit={handleAddSupervisor}
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <h3 className="text-lg font-medium mb-4">Ajouter un superviseur</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="email"
                value={newSupervisorEmail}
                onChange={(e) => setNewSupervisorEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email du superviseur"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={addingSupervisor}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addingSupervisor ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </form>

        <div>
          <h3 className="text-lg font-medium mb-4">Liste des superviseurs</h3>
          <ul className="space-y-2">
            {supervisors.map((supervisor) => (
              <li key={supervisor.uid} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {supervisor.displayName || supervisor.email}
                  </p>
                  <p className="text-sm text-gray-500">{supervisor.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveSupervisor(supervisor.uid)}
                  className="text-red-600 hover:text-red-900"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GestionMissionsPage;
