import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: string;
}

interface UserModalProps {
  missionId: string;
  onClose: () => void;
  onUserAdded: () => void;
}

const UserModal: React.FC<UserModalProps> = ({
  missionId,
  onClose,
  onUserAdded,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<
    { userId: string; role: "ta" | "supervisor" }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implémenter la récupération des utilisateurs disponibles
    // Pour l'instant, simuler des données
    const mockUsers: User[] = [
      { id: "1", email: "ta1@example.com", displayName: "TA 1", role: "ta" },
      { id: "2", email: "ta2@example.com", displayName: "TA 2", role: "ta" },
      {
        id: "3",
        email: "supervisor1@example.com",
        displayName: "Superviseur 1",
        role: "supervisor",
      },
      {
        id: "4",
        email: "supervisor2@example.com",
        displayName: "Superviseur 2",
        role: "supervisor",
      },
    ];

    setUsers(mockUsers);
    setLoading(false);
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (
    userId: string,
    defaultRole: "ta" | "supervisor"
  ) => {
    setSelectedUsers((prev) => {
      const existing = prev.find((u) => u.userId === userId);
      if (existing) {
        return prev.filter((u) => u.userId !== userId);
      } else {
        return [...prev, { userId, role: defaultRole }];
      }
    });
  };

  const updateUserRole = (userId: string, role: "ta" | "supervisor") => {
    setSelectedUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, role } : u))
    );
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      alert("Veuillez sélectionner au moins un utilisateur");
      return;
    }

    try {
      // TODO: Implémenter l'ajout des utilisateurs à la mission
      console.log(
        "Ajout des utilisateurs à la mission:",
        missionId,
        selectedUsers
      );

      // Pour l'instant, simuler un succès
      alert(`${selectedUsers.length} utilisateur(s) ajouté(s) à la mission`);
      onUserAdded();
    } catch (error) {
      console.error("Erreur lors de l'ajout des utilisateurs:", error);
      alert("Erreur lors de l'ajout des utilisateurs");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Ajouter des utilisateurs à la mission
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Liste des utilisateurs */}
        <div className="max-h-96 overflow-y-auto mb-4">
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.find(
                (u) => u.userId === user.id
              );
              const selectedRole =
                isSelected?.role || (user.role as "ta" | "supervisor");

              return (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() =>
                    toggleUserSelection(
                      user.id,
                      user.role as "ta" | "supervisor"
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.displayName || user.email}
                        </p>
                        {user.displayName && (
                          <p className="text-sm text-gray-500">{user.email}</p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateUserRole(user.id, "ta");
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            selectedRole === "ta"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          TA
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateUserRole(user.id, "supervisor");
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            selectedRole === "supervisor"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          Superviseur
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>

        {/* Résumé de la sélection */}
        {selectedUsers.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {selectedUsers.length} utilisateur(s) sélectionné(s):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((selectedUser) => {
                const user = users.find((u) => u.id === selectedUser.userId);
                return (
                  <span
                    key={selectedUser.userId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs"
                  >
                    {user?.displayName || user?.email}
                    <span
                      className={`px-1 rounded text-xs ${
                        selectedUser.role === "ta"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {selectedUser.role === "ta" ? "TA" : "Superviseur"}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Ajouter ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
