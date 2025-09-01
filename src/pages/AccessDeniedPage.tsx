import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AccessDeniedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleRedirectToCactus = () => {
    window.location.href = "https://cactus-tech.fr";
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Rediriger vers la page de connexion après déconnexion
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, rediriger quand même vers login
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-600 to-red-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-2">Cactus Admin</h1>
          <p className="text-red-100">Accès restreint</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 w-full">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 19.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Accès non autorisé
            </h2>

            <p className="text-gray-600 mb-4">
              Votre compte ({user?.email}) n'a pas les permissions nécessaires
              pour accéder à l'interface d'administration.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Téléacteurs :</strong> Veuillez vous connecter sur
                l'interface principale.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleRedirectToCactus}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-150 ease-in-out"
            >
              Aller sur Cactus Tech
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition duration-150 ease-in-out"
            >
              Se déconnecter
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Si vous pensez qu'il s'agit d'une erreur, contactez votre
              administrateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
