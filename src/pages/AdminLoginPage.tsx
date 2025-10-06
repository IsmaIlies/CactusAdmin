import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

const allowedEmails = [
  "i.boultame@mars-marketing.fr",
  "i.brai@mars-marketing.fr",
];

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!allowedEmails.includes(normalizedEmail)) {
        setError("Accès refusé. Identifiants réservés à l'équipe Cactus.");
        return;
      }

      const success = await login(normalizedEmail, password);
      if (success) {
        navigate("/admin/control");
      } else {
        setError("Identifiants invalides. Veuillez réessayer.");
      }
    } catch (err) {
      setError("Impossible de vous connecter pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(14,165,233,0.2),transparent_60%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.65em] text-white/50">Cactus</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-[0.15em]">Admin Access</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] backdrop-blur">
            <div className="absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="admin-email" className="text-xs uppercase tracking-[0.25em] text-white/60">
                  Identifiant admin
                </label>
                <input
                  id="admin-email"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  placeholder="admin@cactus-tech.fr"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-password" className="text-xs uppercase tracking-[0.25em] text-white/60">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-sky-400/40 bg-gradient-to-r from-sky-500/30 to-blue-500/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white transition-all duration-300 hover:scale-[1.02] hover:border-sky-300/60 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              >
                <span className="pointer-events-none absolute inset-0 -translate-y-full bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100" />
                {loading ? "Connexion..." : "Connexion"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Retour à l'espace principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
