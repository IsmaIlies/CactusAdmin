import React, { useEffect, useState } from "react";
import salesService, { ContactsArgues } from "../services/salesService";
import { useAuth } from "../contexts/AuthContext";

const CivCaDashboardPage: React.FC = () => {
  const { user, isAdmin: isAdminRole, isDirection: isDirectionRole, isSuperviseur: isSupRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [periodTotal, setPeriodTotal] = useState<number>(0);
  const [items, setItems] = useState<ContactsArgues[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const missionNamesLower = (): string[] => {
    const list: string[] = [];
    const push = (v?: any) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach((x) => push(x));
      else list.push(String(v).toLowerCase());
    };
    push(user?.assignedMissions);
    push(user?.customClaims?.missions);
    if (Array.isArray((user as any)?.missions)) {
      (user as any).missions.forEach((m: any) => push(m?.name));
    }
    return list;
  };

  const canAccessCIV = (): boolean => {
    if (isAdminRole() || isDirectionRole()) return true;
    if (!isSupRole()) return false;
    const lowers = missionNamesLower();
    return lowers.some((m) => m.includes("civ"));
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const list = await salesService.getContactsArguesForPeriod(startDate || undefined, endDate || undefined, "canal-civ");
        setItems(list);
        const total = list.reduce((sum, it) => sum + (it.count || 0), 0);
        setPeriodTotal(total);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [startDate, endDate, user]);

  const title = "Synthèse CA – Côte d'Ivoire";

  return (
    <div className="space-y-4">
      {!canAccessCIV() && (
        <div className="text-red-500">Accès refusé : vous n'avez pas accès aux KPI Canal+ CIV.</div>
      )}
      {canAccessCIV() && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white/80" />
              <span className="text-cactus-200">→</span>
              <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white/80" />
              <button onClick={()=>{setStartDate(""); setEndDate("");}} className="text-sm px-2 py-1 rounded bg-cactus-700 text-white hover:bg-cactus-600">Réinitialiser</button>
            </div>
          </div>

          {loading && <div>Chargement…</div>}
          {error && <div className="text-red-500">{error}</div>}

          {!loading && !error && (
            <div className="space-y-3">
              <div className="p-4 rounded bg-cactus-800 text-white">
                <div className="text-sm opacity-80">Total CA (période sélectionnée)</div>
                <div className="text-3xl font-bold">{periodTotal}</div>
              </div>
              <div className="bg-white rounded shadow divide-y">
                <div className="px-3 py-2 text-sm font-semibold bg-cactus-100">Historique</div>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">CA (nb)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it)=> (
                        <tr key={it.id || it.date} className="odd:bg-cactus-50/40">
                          <td className="px-3 py-2">{new Date(it.date).toLocaleDateString("fr-FR")}</td>
                          <td className="px-3 py-2 font-medium">{it.count}</td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-cactus-500" colSpan={2}>Aucune donnée pour la période</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CivCaDashboardPage;
