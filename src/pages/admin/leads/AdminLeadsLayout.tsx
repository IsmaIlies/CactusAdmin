import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { LayoutDashboard, LineChart, ClipboardCheck, LogOut } from "lucide-react";

const navItems = [
  { to: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "sales", label: "Sales", Icon: LineChart },
  { to: "checklist", label: "Leads commandés", Icon: ClipboardCheck },
];

const AdminLeadsLayout = () => {
  const { logout } = useAuth();

  return (
    <div className="relative flex h-screen bg-[#010720] text-white">
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl" />

      <aside className="relative z-10 flex h-full w-72 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#00154f] via-[#012b8c] to-[#0a48e6] shadow-[0_15px_35px_rgba(4,15,45,0.35)]">
        <div className="px-6 py-8 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-lg">
              🍊
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">Admin Orange Leads</h1>
              <p className="text-xs uppercase tracking-[0.35em] text-white/65">
                Mission Control SaaS
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-white/20 shadow-[0_10px_25px_rgba(0,12,69,0.28)]"
                    : "bg-white/5 hover:bg-white/10"
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 px-4 pb-6 pt-4">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg bg-white/20 py-3 text-sm font-semibold text-white transition-all hover:bg-white/25 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-[#002a7d]"
          >
            <span className="flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 overflow-y-auto bg-gradient-to-br from-[#010720]/80 via-[#021550]/80 to-[#0633a1]/75 text-white">
        <div className="pointer-events-none sticky top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-10 py-12 pb-20">
          <header className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.45em] text-blue-200/70">
              Orange Leads · Mission Control
            </p>
            <h2 className="text-3xl font-semibold text-white/95">
              Pilotage des leads
            </h2>
          </header>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLeadsLayout;
