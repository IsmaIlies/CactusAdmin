import React, { useState } from "react";
import { Shield } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";

const InitializeAdminPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleInitializeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const functions = getFunctions(undefined, "europe-west9");
      const initializeFirstAdminFunction = httpsCallable(
        functions,
        "initializeFirstAdmin"
      );
      await initializeFirstAdminFunction({ email });
      setSuccess(true);
    } catch (error: any) {
      setError(
        error.message || "Erreur lors de l'initialisation de l'administrateur"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Administrateur initialisé
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              L'utilisateur {email} est maintenant administrateur. Vous pouvez
              vous reconnecter pour accéder aux fonctionnalités
              d'administration.
            </p>
            <div className="mt-6">
              <a
                href="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Aller à la connexion
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Initialiser le premier administrateur
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Cette page permet de définir le premier administrateur du système.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleInitializeAdmin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Adresse email de l'administrateur"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Initialisation...
                </div>
              ) : (
                "Initialiser l'administrateur"
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="font-medium text-green-600 hover:text-green-500"
            >
              Retour à la connexion
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitializeAdminPage;
