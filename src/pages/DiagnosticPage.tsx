import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const DiagnosticPage: React.FC = () => {
  const location = useLocation();
  const [urlInfo, setUrlInfo] = useState<any>({});
  const {
    user,
    isAdmin,
    isDirection,
    isSuperviseur,
    isTA,
    canManageUsers,
    refreshUserClaims,
    debugUserRoles,
  } = useAuth();

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    setUrlInfo({
      fullURL: window.location.href,
      pathname: location.pathname,
      search: location.search,
      mode: params.get("mode"),
      oobCode: params.get("oobCode"),
      continueUrl: params.get("continueUrl"),
      apiKey: params.get("apiKey"),
      allParams: Object.fromEntries(params.entries()),
    });
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔍 Diagnostic des liens Firebase
        </h1>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              URL Information:
            </h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(urlInfo, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Status:
            </h2>
            {urlInfo.mode ? (
              <div className="text-green-600">
                ✅ Lien d'action Firebase détecté (mode: {urlInfo.mode})
              </div>
            ) : (
              <div className="text-blue-600">
                ℹ️ Page de diagnostic - pas de paramètres d'action Firebase
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Liens de test:
            </h2>
            <div className="space-y-2">
              <a
                href="/__/auth/action"
                className="block text-blue-600 underline hover:text-blue-800"
              >
                /__/auth/action (Route Firebase standard)
              </a>
              <a
                href="/auth/action"
                className="block text-blue-600 underline hover:text-blue-800"
              >
                /auth/action (Route alternative)
              </a>
              <a
                href="/action"
                className="block text-blue-600 underline hover:text-blue-800"
              >
                /action (Route courte)
              </a>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
              <li>
                Testez les liens ci-dessus - ils doivent tous afficher cette
                page
              </li>
              <li>
                Déclenchez un email Firebase (reset password, verify email)
              </li>
              <li>Cliquez sur le lien dans l'email reçu</li>
              <li>
                Si vous voyez cette page avec les paramètres Firebase, c'est que
                ça marche !
              </li>
              <li>
                Si vous voyez la page par défaut Firebase, vérifiez la config
                Console
              </li>
            </ol>
          </div>

          {/* Section de test des permissions utilisateur */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              🔐 Test des Permissions Utilisateur:
            </h2>
            {user ? (
              <div className="bg-green-50 p-4 rounded">
                <div className="mb-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Utilisateur connecté :
                  </h3>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Nom:</strong> {user.displayName || "Non défini"}
                  </p>
                  <p>
                    <strong>Rôle:</strong> {user.role || "Aucun rôle défini"}
                  </p>
                  <p>
                    <strong>Email vérifié:</strong>{" "}
                    {user.emailVerified ? "✅" : "❌"}
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Permissions :
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Admin: {isAdmin() ? "✅" : "❌"}</div>
                    <div>Direction: {isDirection() ? "✅" : "❌"}</div>
                    <div>Superviseur: {isSuperviseur() ? "✅" : "❌"}</div>
                    <div>TA: {isTA() ? "✅" : "❌"}</div>
                    <div>
                      Gestion Utilisateurs: {canManageUsers() ? "✅" : "❌"}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Custom Claims :
                  </h3>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(user.customClaims, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={refreshUserClaims}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                  >
                    Rafraîchir Claims
                  </button>
                  <button
                    onClick={debugUserRoles}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
                  >
                    Debug Console
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 p-4 rounded">
                <p className="text-red-800">❌ Aucun utilisateur connecté</p>
                <a href="/login" className="text-blue-600 hover:underline">
                  Aller à la page de connexion
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
