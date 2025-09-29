import { useEffect, useMemo, useState } from "react";
import leadsSalesService, {
  LeadsSaleRecord,
  PROVIDERS_ORDER,
  createEmptyCounts,
} from "../../../services/leadsSalesService";
import LeadsSalesTableModule from "../../../components/admin/LeadsSalesTableModule";

const providerLabels: Record<(typeof PROVIDERS_ORDER)[number], string> = {
  hipto: "HIPTO",
  dolead: "DOLEAD",
  "mars marketing": "MARS MARKETING",
};

const AdminLeadsDashboardPage = () => {
  const [salesRecords, setSalesRecords] = useState<LeadsSaleRecord[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  const providerSummaries = useMemo(() => {
    const base = {
      hipto: {
        label: providerLabels.hipto,
        counts: createEmptyCounts(),
        sales: [] as LeadsSaleRecord[],
      },
      dolead: {
        label: providerLabels.dolead,
        counts: createEmptyCounts(),
        sales: [] as LeadsSaleRecord[],
      },
      "mars marketing": {
        label: providerLabels["mars marketing"],
        counts: createEmptyCounts(),
        sales: [] as LeadsSaleRecord[],
      },
    } as Record<(typeof PROVIDERS_ORDER)[number], { label: string; counts: ReturnType<typeof createEmptyCounts>; sales: LeadsSaleRecord[] }>;

    salesRecords.forEach((record) => {
      if (!record.isToday) return;
      const provider = record.providerNormalized;
      if (!provider) return;
      base[provider].counts.internet += record.categoryFlags.internet;
      base[provider].counts.mobile += record.categoryFlags.mobile;
      base[provider].counts.internetSosh += record.categoryFlags.internetSosh;
      base[provider].counts.mobileSosh += record.categoryFlags.mobileSosh;
      base[provider].sales.push(record);
    });

    return base;
  }, [salesRecords]);

  useEffect(() => {
    setSalesLoading(true);
    const unsubscribe = leadsSalesService.subscribeToSalesRecords(
      (records) => {
        setSalesRecords(records);
        setSalesLoading(false);
      },
      (error) => {
        console.error("Erreur lors du chargement des ventes leads (records)", error);
        setSalesRecords([]);
        setSalesLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <section className="space-y-8 text-blue-100/85">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Leads – Ventes du jour</h1>
        <p className="text-sm text-blue-100/70">
          Répartition en temps réel des conversions Hipto, Dolead et Mars Marketing.
        </p>
      </header>

      <div className="grid gap-6">
        {PROVIDERS_ORDER.map((providerKey) => {
          const summary = providerSummaries[providerKey];
          const counts = summary.counts;
          const total = summary.sales.length;
          return (
            <section
              key={providerKey}
              className="rounded-3xl bg-white/8 p-6 text-blue-100/85 shadow-[0_22px_50px_rgba(3,24,93,0.35)] backdrop-blur"
            >
              <div className="flex items-center justify-between text-white/90">
                <h2 className="text-xl font-semibold">{summary.label}</h2>
                <span className="text-sm text-blue-100/70">
                  {total} vente{total > 1 ? "s" : ""}
                </span>
              </div>

              <table className="mt-4 w-full text-center text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-[0.25em] text-blue-100/70">
                  <tr>
                    <th className="px-3 py-2">Internet</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2">Internet Sosh</th>
                    <th className="px-3 py-2">Mobile Sosh</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white/5 text-white/90">
                    <td className="px-3 py-3 text-lg font-semibold">{counts.internet}</td>
                    <td className="px-3 py-3 text-lg font-semibold">{counts.mobile}</td>
                    <td className="px-3 py-3 text-lg font-semibold">{counts.internetSosh}</td>
                    <td className="px-3 py-3 text-lg font-semibold">{counts.mobileSosh}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-4 text-xs text-blue-100/65">
                Comptage basé uniquement sur le champ <code className="font-mono">typeOffre</code>.
              </p>
              {salesLoading && (
                <p className="mt-2 text-xs text-blue-100/60">Chargement…</p>
              )}
            </section>
          );
        })}
      </div>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white/90">Détails des ventes</h2>
          <p className="text-sm text-blue-100/65">
            Liste brute des documents Firestore `leads_sales` (mise à jour en temps réel).
          </p>
        </header>
        <LeadsSalesTableModule sales={salesRecords} isLoading={salesLoading} />
      </section>
    </section>
  );
};

export default AdminLeadsDashboardPage;
