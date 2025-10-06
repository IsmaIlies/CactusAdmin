import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  UserCog,
  Plus,
  UserRound,
  Power,
  KeyRound,
} from "lucide-react";
import userService, { FirebaseUser, USER_ROLES } from "../services/userService";

const AdminUsersPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLastName, setFormLastName] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formOperation, setFormOperation] = useState("canal");
  const [formRole, setFormRole] = useState("admin");
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<FirebaseUser | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userOperation, setUserOperation] = useState("canal");
  const [userRole, setUserRole] = useState("user");
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userUpdating, setUserUpdating] = useState(false);
  const [userFeedback, setUserFeedback] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [forceTargetId, setForceTargetId] = useState<string | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<FirebaseUser | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const fetched = await userService.getUsers();
      setUsers(fetched);
    } catch (err: any) {
      setError(err?.message ?? "Impossible de charger les utilisateurs.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchRole =
        roleFilter === "all" || (user.role || "").toLowerCase() === roleFilter;

      if (!matchRole) return false;

      if (!normalizedSearch) return true;
      const emailMatches = user.email?.toLowerCase().includes(normalizedSearch);
      const firstNameMatches = user.firstName
        ?.toLowerCase()
        .includes(normalizedSearch);
      const displayMatches = user.displayName
        ?.toLowerCase()
        .includes(normalizedSearch);

      return emailMatches || firstNameMatches || displayMatches;
    });
  }, [users, roleFilter, searchTerm]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => a.email.localeCompare(b.email));
  }, [filteredUsers]);

  const roleLabel = (role: string) => {
    const found = USER_ROLES.find((r) => r.value === role);
    return found?.label ?? role ?? "—";
  };

  const handleForceLogout = async (userId: string) => {
    setForceTargetId(userId);
    setActionFeedback(null);
    try {
      const message = await userService.forceLogout(userId);
      setActionFeedback(message);
    } catch (err: any) {
      setActionFeedback(err?.message ?? "Erreur lors de la déconnexion.");
    } finally {
      setForceTargetId(null);
    }
  };

  const openPasswordModal = (user: FirebaseUser) => {
    setPasswordFeedback(null);
    setPasswordValue("");
    setPasswordConfirm("");
    setPasswordModalUser(user);
    setIsPasswordModalOpen(true);
  };

  const submitPasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordModalUser) return;
    if (passwordValue.length < 8) {
      setPasswordFeedback("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (passwordValue !== passwordConfirm) {
      setPasswordFeedback("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordFeedback(null);
      const message = await userService.updateUser(passwordModalUser.uid, {
        password: passwordValue,
      });
      setPasswordFeedback(message || "Mot de passe mis à jour");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordModalUser(null);
      }, 1200);
    } catch (err: any) {
      setPasswordFeedback(err?.message ?? "Impossible de mettre à jour le mot de passe.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(12,63,191,0.18),transparent_70%)]" />

      <div
        className={`fixed top-6 z-20 transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
          sidebarOpen ? "left-80" : "left-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-white/35 hover:bg-white/20"
          aria-expanded={sidebarOpen}
          aria-controls="admin-users-sidebar"
        >
          {sidebarOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          Menu
        </button>
      </div>

      <aside
        id="admin-users-sidebar"
        className={`fixed left-0 top-0 z-10 flex min-h-screen w-72 transform flex-col justify-between overflow-hidden border-r border-white/12 bg-black/90 px-7 py-10 shadow-[0_45px_150px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1e3a8a]/80 via-[#0ea5e9]/40 to-transparent transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
            sidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-16"
          }`}
        />
        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.65em] text-white/50">Cactus</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[0.2em] text-white">Utilisateurs</h1>
            <p className="mt-3 text-xs text-white/55">Gestion des accès centrale</p>
          </div>

          <div className="h-px w-full bg-white/15" />

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                navigate("/admin/control");
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/20"
            >
              <span>Dashboard</span>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/20"
            >
              <span>Utilisateurs</span>
              <UserCog className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3 text-xs text-white/55">
            <p>Module de gestion des comptes en préparation.</p>
            <p>Les fonctionnalités avancées seront disponibles prochainement.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/35 hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Déconnexion
        </button>
      </aside>

      <main className="relative z-0 flex h-screen flex-1 flex-col overflow-y-auto px-6 pb-12 pt-28">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 text-white">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.45em] text-white/55">
              Utilisateurs Cactus
            </p>
            <h2 className="text-3xl font-semibold tracking-[0.2em]">Gestion des accès</h2>
            <p className="max-w-2xl text-sm text-white/60">
              Liste consolidée des comptes Cactus. Les actions avancées seront bientôt disponibles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormFeedback(null);
              setFormLastName("");
              setFormFirstName("");
              setFormEmail("");
              setFormOperation("canal");
              setFormRole("admin");
              setIsModalOpen(true);
            }}
            className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-white/35 hover:bg-white/20"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nouveau compte
          </button>
        </header>

        <section className="relative flex-1 overflow-hidden rounded-3xl border border-white/12 bg-black/70 shadow-[0_45px_140px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-sm text-white/65">
              <span>Total : {loading ? "..." : sortedUsers.length}</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50">
                  <span>Rôle</span>
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white focus:border-white/35 focus:outline-none"
                  >
                    <option value="all">Tous</option>
                    {USER_ROLES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher (email ou prénom)"
                  className="rounded-full border border-white/15 bg-black/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white placeholder:text-white/40 focus:border-white/35 focus:outline-none"
                />
              </div>
              {loading && <span className="text-xs uppercase tracking-[0.35em]">Chargement…</span>}
            </div>
            <div className="flex-1 overflow-auto px-2 pb-4">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-black/80 text-xs uppercase tracking-[0.25em] text-white/50">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-2 py-3 font-semibold">Prénom</th>
                    <th className="px-2 py-3 font-semibold">Rôle</th>
                    <th className="px-2 py-3 font-semibold">Dernière connexion</th>
                    <th className="px-2 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr
                      key={user.uid}
                      className="border-b border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
                    >
                      <td className="truncate px-3 py-3 text-white">{user.email}</td>
                      <td className="px-2 py-3 text-white/70">
                        {user.firstName || user.displayName?.split(" ")[0] || "—"}
                      </td>
                      <td className="px-2 py-3 text-white/70">{roleLabel(user.role)}</td>
                      <td className="px-2 py-3 text-white/60">
                        {user.lastSignInTime
                          ? new Date(user.lastSignInTime).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserEmail(user.email || "");
                              setUserFirstName(
                                user.firstName || user.displayName?.split(" ")[0] || ""
                              );
                              setUserLastName(user.lastName || "");
                              setUserRole(user.role || "user");
                              setUserOperation(
                                user.customClaims?.operation === "leads"
                                  ? "leads"
                                  : "canal"
                              );
                              setIsUserModalOpen(true);
                              setUserFeedback(null);
                              setActionFeedback(null);
                            }}
                            className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:border-white/35 hover:bg-white/20"
                            aria-label="Voir la fiche"
                          >
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleForceLogout(user.uid)}
                            disabled={forceTargetId === user.uid}
                            className="rounded-full border border-red-400/30 bg-red-500/10 p-2 text-red-200 transition hover:border-red-300/60 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-red-400/20 disabled:bg-red-500/5 disabled:text-red-200/50"
                            aria-label="Forcer la déconnexion"
                          >
                            {forceTargetId === user.uid ? (
                              <span className="block h-4 w-4 animate-spin rounded-full border-[2px] border-red-200 border-t-transparent" />
                            ) : (
                              <Power className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openPasswordModal(user)}
                            className="rounded-full border border-blue-400/30 bg-blue-500/10 p-2 text-blue-200 transition hover:border-blue-300/60 hover:bg-blue-500/15"
                            aria-label="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                          </button>
                       </div>
                     </td>
                   </tr>
                 ))}
                  {!loading && sortedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                        Aucun utilisateur pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {error && (
          <p className="mt-6 text-xs text-red-300/80">{error}</p>
        )}

        {actionFeedback && (
          <div className="mt-4 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-center text-xs text-white/70">
            {actionFeedback}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-[#051435]/95 via-[#0c3fbf]/90 to-[#031b4f]/90 px-6 py-8 shadow-[0_55px_160px_rgba(5,20,70,0.7)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-xs uppercase tracking-[0.35em] text-white/50 transition hover:text-white"
              >
                Fermer
              </button>

              <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Créer un compte
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Fonctionnalité en construction. Remplissez les informations pour préparer la création.
              </p>

              {formFeedback && (
                <div className="mt-4 rounded-xl border border-green-400/40 bg-green-500/15 px-4 py-2 text-xs text-green-100">
                  {formFeedback}
                </div>
              )}

              <form
                className="mt-6 space-y-4 text-sm text-white/70"
                onSubmit={(event) => {
                  event.preventDefault();
                  setFormFeedback(
                    "Création disponible prochainement. Merci pour votre saisie."
                  );
                  setTimeout(() => setIsModalOpen(false), 1500);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Nom
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(event) => setFormLastName(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                      placeholder="Ex: Dupont"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Prénom
                    <input
                      type="text"
                      value={formFirstName}
                      onChange={(event) => setFormFirstName(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                      placeholder="Ex: Alice"
                      required
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                  Email
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(event) => setFormEmail(event.target.value)}
                    className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                    placeholder="prenom.nom@cactus.fr"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Opération
                    <select
                      value={formOperation}
                      onChange={(event) => setFormOperation(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white focus:border-sky-400/60 focus:outline-none"
                    >
                      <option value="canal">CANAL+</option>
                      <option value="leads">Leads</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Rôle
                    <select
                      value={formRole}
                      onChange={(event) => setFormRole(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white focus:border-sky-400/60 focus:outline-none"
                    >
                      {USER_ROLES.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-white/35 hover:bg-white/25"
                  >
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isUserModalOpen && selectedUser && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-[#050b1f]/95 via-[#0b1f63]/90 to-[#050b1f]/95 px-6 py-8 shadow-[0_55px_160px_rgba(5,20,70,0.7)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setIsUserModalOpen(false);
                  setSelectedUser(null);
                  setUserFeedback(null);
                }}
                className="absolute right-4 top-4 text-xs uppercase tracking-[0.35em] text-white/50 transition hover:text-white"
              >
                Fermer
              </button>

              <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Profil utilisateur
              </h3>
              <p className="mt-2 text-sm text-white/65">
                Modification directe des informations pour {selectedUser.email}.
              </p>

              {userFeedback && (
                <div className="mt-4 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-xs text-sky-100">
                  {userFeedback}
                </div>
              )}

              <form
                className="mt-6 space-y-4 text-sm text-white/75"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!selectedUser) return;
                  const trimmedEmail = userEmail.trim();
                  if (!trimmedEmail) {
                    setUserFeedback("Email requis");
                    return;
                  }
                  try {
                    setUserUpdating(true);
                    setUserFeedback(null);
                    await userService.updateUser(selectedUser.uid, {
                      displayName: `${userFirstName} ${userLastName}`.trim(),
                      firstName: userFirstName.trim(),
                      lastName: userLastName.trim(),
                      email: trimmedEmail,
                      operation: userOperation,
                    });
                    if ((selectedUser.role || "user") !== userRole) {
                      await userService.updateUserRole(selectedUser.uid, userRole);
                    }
                    setUserFeedback("Profil mis à jour");
                    await loadUsers();
                    setTimeout(() => {
                      setIsUserModalOpen(false);
                      setSelectedUser(null);
                      setUserFeedback(null);
                    }, 1200);
                  } catch (err: any) {
                    setUserFeedback(
                      err?.message ?? "Impossible de mettre à jour l'utilisateur"
                    );
                  } finally {
                    setUserUpdating(false);
                  }
                }}
              >
                <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                  Email
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(event) => setUserEmail(event.target.value)}
                    className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Prénom
                    <input
                      type="text"
                      value={userFirstName}
                      onChange={(event) => setUserFirstName(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Nom
                    <input
                      type="text"
                      value={userLastName}
                      onChange={(event) => setUserLastName(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Opération
                    <select
                      value={userOperation}
                      onChange={(event) => setUserOperation(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white focus:border-sky-400/60 focus:outline-none"
                    >
                      <option value="canal">CANAL+</option>
                      <option value="leads">Leads</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                    Rôle
                    <select
                      value={userRole}
                      onChange={(event) => setUserRole(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white focus:border-sky-400/60 focus:outline-none"
                    >
                      {USER_ROLES.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-white/55">
                  <span>
                    Dernière connexion : {selectedUser.lastSignInTime
                      ? new Date(selectedUser.lastSignInTime).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  <span>
                    Création du compte : {selectedUser.creationTime
                      ? new Date(selectedUser.creationTime).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserModalOpen(false);
                      setSelectedUser(null);
                      setUserFeedback(null);
                    }}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={userUpdating}
                    className="rounded-full border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-sky-300/60 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-sky-400/20 disabled:bg-sky-500/10"
                  >
                    {userUpdating ? "..." : "Enregistrer"}
                  </button>
               </div>
                </form>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setUserFeedback(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-red-200 transition hover:border-red-300/60 hover:bg-red-500/20"
                  >
                    Supprimer le compte
                  </button>
                </div>
            </div>
          </div>
        )}

        {isPasswordModalOpen && passwordModalUser && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-[#050b1f]/95 via-[#0a1f45]/90 to-[#050b1f]/95 px-6 py-8 shadow-[0_60px_160px_rgba(5,20,70,0.7)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordModalUser(null);
                  setPasswordFeedback(null);
                }}
                className="absolute right-4 top-4 text-xs uppercase tracking-[0.35em] text-white/50 transition hover:text-white"
              >
                Fermer
              </button>

              <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Mot de passe
              </h3>
              <p className="mt-2 text-sm text-white/65">
                Définissez un nouveau mot de passe pour {passwordModalUser.email}.
              </p>

              {passwordFeedback && (
                <div className="mt-4 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-xs text-sky-100">
                  {passwordFeedback}
                </div>
              )}

              <form className="mt-6 space-y-4 text-sm text-white/75" onSubmit={submitPasswordChange}>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                  Nouveau mot de passe
                  <input
                    type="password"
                    value={passwordValue}
                    onChange={(event) => setPasswordValue(event.target.value)}
                    minLength={8}
                    className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                    placeholder="Minimum 8 caractères"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.25em]">
                  Confirmer
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    minLength={8}
                    className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
                    placeholder="Retapez le mot de passe"
                    required
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordModalOpen(false);
                      setPasswordModalUser(null);
                      setPasswordFeedback(null);
                    }}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="rounded-full border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-sky-300/60 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-sky-400/20 disabled:bg-sky-500/10"
                  >
                    {passwordLoading ? "..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-[#330000]/95 via-[#400404]/90 to-[#1a0202]/95 px-6 py-8 shadow-[0_65px_180px_rgba(120,20,20,0.6)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteLoading(false);
                }}
                className="absolute right-4 top-4 text-xs uppercase tracking-[0.35em] text-white/50 transition hover:text-white"
              >
                Fermer
              </button>

              <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Suppression de compte
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Supprimer le compte <span className="text-white">{selectedUser.email}</span> ?
                L'historique des ventes sera conservé mais l'accès sera révoqué.
              </p>

              <div className="mt-6 flex flex-col gap-3 text-xs text-white/60">
                <span>✦ Prénom : {userFirstName || "—"}</span>
                <span>✦ Nom : {userLastName || "—"}</span>
                <span>✦ Rôle : {roleLabel(userRole)}</span>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteLoading(false);
                  }}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedUser) return;
                    try {
                      setDeleteLoading(true);
                      setUserFeedback(null);
                      const message = await userService.deleteUser(selectedUser.uid);
                      setUserFeedback(message || "Compte supprimé");
                      await loadUsers();
                      setTimeout(() => {
                        setIsDeleteModalOpen(false);
                        setIsUserModalOpen(false);
                        setSelectedUser(null);
                        setUserFeedback(null);
                        setDeleteLoading(false);
                      }, 1200);
                    } catch (err: any) {
                      setUserFeedback(
                        err?.message ?? "Impossible de supprimer l'utilisateur"
                      );
                      setDeleteLoading(false);
                    }
                  }}
                  className="rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-red-100 transition hover:border-red-300/60 hover:bg-red-500/30 disabled:cursor-not-allowed"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Suppression..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUsersPage;
