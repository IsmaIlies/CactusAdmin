import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import userService, {
  FirebaseUser,
  USER_ROLES,
  UserUpdateData,
} from "../services/userService";
import { Trash2, Mail, Key, Edit2 } from "lucide-react";

const UserManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserUpdateData>({});

  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const usersData = await userService.getUsers();
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingUserId(userId);
      setError("");

      const message = await userService.updateUserRole(userId, newRole);

      // Recharger la liste des utilisateurs
      await loadUsers();
      alert(message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`
      )
    ) {
      try {
        setUpdatingUserId(userId);
        setError("");

        const message = await userService.deleteUser(userId);

        // Recharger la liste des utilisateurs
        await loadUsers();
        alert(message);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUpdatingUserId(null);
      }
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      setError("");

      const message = await userService.sendPasswordReset(email);
      alert(message);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendEmailVerification = async (userId: string) => {
    try {
      setUpdatingUserId(userId);
      setError("");

      const message = await userService.sendEmailVerification(userId);
      alert(message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStartEdit = (user: FirebaseUser) => {
    setEditingUserId(user.uid);
    setEditFormData({
      displayName: user.displayName || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    });
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      setUpdatingUserId(userId);
      setError("");

      const message = await userService.updateUser(userId, editFormData);

      // Recharger la liste des utilisateurs
      await loadUsers();
      setEditingUserId(null);
      setEditFormData({});
      alert(message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFormData({});
  };

  if (!isAdmin()) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Chargement des utilisateurs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des utilisateurs
          </h1>
          <p className="text-gray-600">
            Gérez les rôles et permissions des utilisateurs
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
        >
          {loading ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.displayName
                            ? user.displayName.charAt(0).toUpperCase()
                            : user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || "Nom non défini"}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {user.uid.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userService.getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {userService.getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.emailVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.emailVerified
                        ? "Email vérifié"
                        : "Email non vérifié"}
                    </span>
                    {user.disabled && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                        Compte désactivé
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.uid, e.target.value)
                      }
                      disabled={updatingUserId === user.uid}
                      className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    {updatingUserId === user.uid && (
                      <div className="ml-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    <button
                      onClick={() => handleStartEdit(user)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteUser(user.uid, user.displayName || "")
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSendPasswordReset(user.email)}
                      className="text-green-500 hover:text-green-700"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSendEmailVerification(user.uid)}
                      className="text-indigo-500 hover:text-indigo-700"
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun utilisateur trouvé</p>
        </div>
      )}

      {editingUserId && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Modifier l'utilisateur
            </h2>
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom complet
              </label>
              <input
                type="text"
                id="displayName"
                value={editFormData.displayName}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    displayName: e.target.value,
                  })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Prénom
              </label>
              <input
                type="text"
                id="firstName"
                value={editFormData.firstName}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    firstName: e.target.value,
                  })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom de famille
              </label>
              <input
                type="text"
                id="lastName"
                value={editFormData.lastName}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    lastName: e.target.value,
                  })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSaveEdit(editingUserId!)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
              >
                {updatingUserId === editingUserId
                  ? "Enregistrement..."
                  : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
