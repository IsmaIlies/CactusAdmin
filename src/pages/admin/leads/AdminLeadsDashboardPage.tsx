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

const providerStyles: Record<
  (typeof PROVIDERS_ORDER)[number],
  {
    container: string;
    hover: string;
    badge: string;
    stat: string;
    statHover: string;
    highlight: string;
  }
> = {
  hipto: {
    container:
      "border border-blue-300/40 bg-gradient-to-br from-blue-600/30 via-sky-500/18 to-blue-400/12",
    hover:
      "transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_28px_75px_rgba(30,100,255,0.38)] hover:from-blue-600/45 hover:via-sky-400/25 hover:to-blue-300/18",
    badge: "bg-blue-500/25 text-blue-50",
    stat: "border-blue-300/30 bg-blue-500/20",
    statHover: "group-hover:border-blue-200/50 group-hover:bg-blue-400/25",
    highlight: "text-sky-200",
  },
  dolead: {
    container:
      "border border-cyan-300/40 bg-gradient-to-br from-cyan-500/25 via-blue-400/18 to-indigo-500/12",
    hover:
      "transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_28px_75px_rgba(10,220,255,0.3)] hover:from-cyan-500/40 hover:via-blue-400/22 hover:to-indigo-400/18",
    badge: "bg-cyan-500/25 text-cyan-50",
    stat: "border-cyan-300/30 bg-cyan-500/18",
    statHover: "group-hover:border-cyan-200/50 group-hover:bg-cyan-400/25",
    highlight: "text-cyan-200",
  },
  "mars marketing": {
    container:
      "border border-indigo-400/40 bg-gradient-to-br from-indigo-600/25 via-blue-500/18 to-purple-500/15",
    hover:
      "transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_28px_75px_rgba(110,80,255,0.35)] hover:from-indigo-600/40 hover:via-blue-500/24 hover:to-purple-500/20",
    badge: "bg-indigo-500/25 text-indigo-50",
    stat: "border-indigo-400/30 bg-indigo-500/18",
    statHover: "group-hover:border-indigo-200/50 group-hover:bg-indigo-400/25",
    highlight: "text-indigo-200",
  },
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
          const styles = providerStyles[providerKey];
          return (
            <section
              key={providerKey}
              className={`group rounded-3xl p-6 text-blue-100/85 backdrop-blur ${styles.container} ${styles.hover}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                <div>
                  <h2 className="text-xl font-semibold tracking-wide">{summary.label}</h2>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                    Ventes du jour
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold ${styles.badge}`}
                >
                  <span className="text-xs uppercase tracking-[0.25em] opacity-80">Total</span>
                  <span className={`text-lg font-semibold ${styles.highlight}`}>
                    {total}
                  </span>
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Internet", value: counts.internet },
                  { label: "Mobile", value: counts.mobile },
                  { label: "Internet SOSH", value: counts.internetSosh },
                  { label: "Mobile SOSH", value: counts.mobileSosh },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-blue-100/80 shadow-inner transition-colors duration-300 ${styles.stat} ${styles.statHover}`}
                  >
                    <span className="uppercase tracking-[0.2em] text-xs text-blue-100/65">
                      {label}
                    </span>
                    <span className="text-xl font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>

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
