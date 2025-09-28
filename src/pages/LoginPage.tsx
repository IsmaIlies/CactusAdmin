import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, loginWithMicrosoft, user, refreshUserClaims } = useAuth();
  const navigate = useNavigate();
  const [selectedUniverse, setSelectedUniverse] = useState<"canal" | "leads" | null>(null);

  const handleUniverseSelection = (universe: "canal" | "leads") => {
    setSelectedUniverse(universe);
    if (user) {
      navigate(universe === "leads" ? "/admin/leads" : "/admin/canal");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        if (selectedUniverse === "leads") {
          navigate("/admin/leads");
        } else if (selectedUniverse === "canal") {
          navigate("/admin/canal");
        } else {
          navigate("/admin/canal");
        }
      } else {
        setError("Identifiants invalides. Veuillez réessayer.");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const success = await loginWithMicrosoft();
      if (success) {
        if (selectedUniverse === "leads") {
          navigate("/admin/leads");
        } else if (selectedUniverse === "canal") {
          navigate("/admin/canal");
        } else {
          navigate("/admin/canal");
        }
      } else {
        setError("Échec de la connexion avec Microsoft. Veuillez réessayer.");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const containerBackgroundClass =
    selectedUniverse === "leads"
      ? "bg-gradient-to-br from-[#001d66] via-[#0c3fbf] to-[#6ca8ff]"
      : "bg-gradient-to-b from-cactus-600 to-cactus-800";

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${containerBackgroundClass}`}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-2">Cactus</h1>
          <p className="text-cactus-100">
            SaaS de pilotage de missions Orange
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 w-full">
          <div className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleUniverseSelection("canal")}
                className={`flex-1 rounded-lg bg-black py-4 text-center text-lg font-semibold text-white shadow transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black hover:bg-[#1a1a1a] ${
                  selectedUniverse === "canal" ? "shadow-lg" : ""
                }`}
                aria-pressed={selectedUniverse === "canal"}
              >
                CANAL+
              </button>
              <button
                type="button"
                onClick={() => handleUniverseSelection("leads")}
                className={`flex-1 rounded-lg bg-[#FF7900] py-4 text-center text-lg font-semibold text-white shadow transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7900] hover:bg-[#ff9740] ${
                  selectedUniverse === "leads" ? "shadow-lg" : ""
                }`}
                aria-pressed={selectedUniverse === "leads"}
              >
                ORANGE LEADS
              </button>
            </div>
            {selectedUniverse && (
              <p className="mt-3 text-center text-sm font-medium text-[#002FA7]">
                Univers sélectionné : {selectedUniverse === "canal" ? "Canal+" : "Orange Leads"}
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email ou nom d'utilisateur
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="ex : a.hubert@mars-marketing.fr ou a.hubert"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-cactus-600 hover:text-cactus-500"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary py-3 flex items-center justify-center transition-colors duration-300 ${
                selectedUniverse === "leads"
                  ? "bg-[#002FA7] hover:bg-[#1c45c4]"
                  : ""
              }`}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="mt-4 w-full btn-secondary py-3 flex items-center justify-center"
            >
              <svg
                className="h-5 w-5 mr-2"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 1H1V10H10V1Z" fill="#F25022" />
                <path d="M20 1H11V10H20V1Z" fill="#7FBA00" />
                <path d="M10 11H1V20H10V11Z" fill="#00A4EF" />
                <path d="M20 11H11V20H20V11Z" fill="#FFB900" />
              </svg>
              Se connecter avec Microsoft
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Besoin d'aide ? Contactez votre administrateur.
            </p>
            {user && (
              <button
                onClick={refreshUserClaims}
                className="mt-2 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
              >
                Rafraîchir mes permissions
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
