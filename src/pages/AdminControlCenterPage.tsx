import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, X, LayoutDashboard, Users, Activity, UserCog } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type LoginActivityPoint = {
  date: string;
  connections: number;
};

const AdminControlCenterPage = () => {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [loginActivity, setLoginActivity] = useState<LoginActivityPoint[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        setUsersError(null);
        const users = await userService.getUsers();
        if (!isMounted) return;
        const now = Date.now();
        const ACTIVE_WINDOW_MINUTES = 60;
        const activeCount = users.reduce((acc, user) => {
          if (!user.lastSignInTime) return acc;
          const lastSignIn = new Date(user.lastSignInTime).getTime();
          if (Number.isNaN(lastSignIn)) return acc;
          const diffMinutes = (now - lastSignIn) / (1000 * 60);
          return diffMinutes <= ACTIVE_WINDOW_MINUTES ? acc + 1 : acc;
        }, 0);

        const DAYS_WINDOW = 10;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyBuckets: { key: string; label: string }[] = [];
        const displayFormatter = new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
        });

        for (let i = DAYS_WINDOW - 1; i >= 0; i -= 1) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          const key = day.toISOString().slice(0, 10);
          dailyBuckets.push({ key, label: displayFormatter.format(day) });
        }

        const loginCountByDay = dailyBuckets.reduce<Record<string, number>>((acc, bucket) => {
          acc[bucket.key] = 0;
          return acc;
        }, {});

        users.forEach((user) => {
          if (!user.lastSignInTime) return;
          const lastSignIn = new Date(user.lastSignInTime);
          if (Number.isNaN(lastSignIn.getTime())) return;
          lastSignIn.setHours(0, 0, 0, 0);
          const key = lastSignIn.toISOString().slice(0, 10);
          if (key in loginCountByDay) {
            loginCountByDay[key] += 1;
          }
        });

        const activitySeries = dailyBuckets.map(({ key, label }) => ({
          date: label,
          connections: loginCountByDay[key] ?? 0,
        }));

        setTotalUsers(users.length);
        setActiveUsers(activeCount);
        setLoginActivity(activitySeries);
      } catch (error: any) {
        if (!isMounted) return;
        setUsersError(error?.message ?? "Impossible de charger les utilisateurs Cactus.");
        setTotalUsers(null);
        setActiveUsers(null);
        setLoginActivity([]);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative flex min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(12,63,191,0.18),transparent_70%)]" />

      <div className={`fixed top-6 z-20 transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${sidebarOpen ? "left-80" : "left-6"}`}>
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-white/35 hover:bg-white/20"
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar"
        >
          {sidebarOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          Menu
        </button>
      </div>

      <aside
        id="admin-sidebar"
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
            <h1 className="mt-4 text-3xl font-semibold tracking-[0.2em] text-white">Control</h1>
            <p className="mt-3 text-xs text-white/55">Centre de pilotage Master</p>
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
              onClick={() => {
                setSidebarOpen(false);
                navigate("/admin/users");
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/20"
            >
              <span>Utilisateurs</span>
              <UserCog className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3 text-xs text-white/55">
            <p>Plateforme haute disponibilité en préparation.</p>
            <p>Les modules de supervision seront activés prochainement.</p>
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

      <main className="relative z-0 flex flex-1 flex-col justify-start px-6 pb-12 pt-28">
        <div
          className={`grid w-full max-w-5xl gap-6 text-left transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] sm:grid-cols-2 lg:grid-cols-3 mx-auto ${
            sidebarOpen ? "lg:pl-72" : "pl-0"
          }`}
        >
          {[
            {
              title: "Utilisateurs Cactus",
              subtitle: "Comptes enregistrés",
              value: totalUsers ?? "...",
              Icon: Users,
            },
            {
              title: "Sessions actives",
              subtitle: "Connexions < 60 min",
              value: activeUsers ?? "...",
              Icon: Activity,
            },
          ].map(({ title, subtitle, value, Icon }) => (
            <div
              key={title}
              className="group flex items-center justify-between rounded-2xl border border-white/15 bg-black/75 px-5 py-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur transition hover:-translate-y-1 hover:border-green-400/60 hover:shadow-[0_35px_120px_rgba(34,197,94,0.35)]"
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
                <p className="text-sm text-white/60">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-white/55 group-hover:text-green-300" aria-hidden="true" />
                <span className="text-2xl font-semibold text-white group-hover:text-green-200">{value}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`relative mt-10 w-full max-w-5xl transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] mx-auto ${
            sidebarOpen ? "lg:pl-72" : "pl-0"
          }`}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/70 p-6 shadow-[0_45px_150px_rgba(16,185,129,0.25)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.28),transparent_65%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/60">Activité</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[0.18em] text-white">
                  Pulsations des connexions
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Volume quotidien des dernières 10 journées. Une vision haute fréquence pour surveiller les pics.
                </p>
              </div>
              <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-emerald-200">
                Mode analyse
              </div>
            </div>

            <div className="relative z-10 mt-8 h-72 w-full">
              {loginActivity.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart data={loginActivity} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="activityArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(16,185,129,0.75)" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="rgba(6,182,212,0.05)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="rgba(209,250,229,0.6)"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                    />
                    <YAxis
                      stroke="rgba(209,250,229,0.45)"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(16,185,129,0.45)", strokeWidth: 1.5 }}
                      contentStyle={{
                        background: "rgba(17,24,39,0.95)",
                        border: "1px solid rgba(16,185,129,0.35)",
                        borderRadius: "12px",
                        color: "#f0fdfa",
                        fontSize: "0.8rem",
                      }}
                      labelStyle={{ color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.18em" }}
                      formatter={(value) => [`${value}`, "Connexions"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="connections"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#activityArea)"
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#22d3ee", stroke: "#0f172a", strokeWidth: 1 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-white/50">
                  Pas encore de pulsations à afficher.
                </div>
              )}
            </div>
          </div>
        </div>

        {usersError && (
          <p className="mt-6 text-xs text-red-300/80">{usersError}</p>
        )}
      </main>
    </div>
  );
};

export default AdminControlCenterPage;
