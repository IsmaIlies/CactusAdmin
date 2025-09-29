import { useEffect, useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import leadsSalesService, {
  LeadsSaleRecord,
  PROVIDERS_ORDER,
  createEmptyCounts,
} from "../../../services/leadsSalesService";
import { SaleCategoryFlags } from "../../../services/salesService";
import LeadsSalesTableModule from "../../../components/admin/LeadsSalesTableModule";

ChartJS.register(ArcElement, Tooltip, Legend);

const providerLabelMap: Record<(typeof PROVIDERS_ORDER)[number], string> = {
  hipto: "HIPTO",
  dolead: "DOLEAD",
  "mars marketing": "MARS MARKETING",
};

const categoryLabelMap: Record<keyof SaleCategoryFlags, string> = {
  internet: "Internet",
  mobile: "Mobile",
  internetSosh: "Internet SOSH",
  mobileSosh: "Mobile SOSH",
};

const providerColors: Record<(typeof PROVIDERS_ORDER)[number], string[]> = {
  hipto: ["#1d4ed8", "#2563eb", "#38bdf8", "#0ea5e9"],
  dolead: ["#f97316", "#fb923c", "#fde68a", "#facc15"],
  "mars marketing": ["#7c3aed", "#a855f7", "#22c55e", "#4ade80"],
};

const AdminLeadsSalesPage = () => {
  const [records, setRecords] = useState<LeadsSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<"" | (typeof PROVIDERS_ORDER)[number]>("");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = leadsSalesService.subscribeToSalesRecords(
      (sales) => {
        setRecords(sales);
        setLoading(false);
      },
      (error) => {
        console.error("Erreur lors du chargement des ventes leads (sales page)", error);
        setRecords([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    records.forEach((record) => {
      if (!record.date) return;
      const value = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, "0")}`;
      months.add(value);
    });
    return Array.from(months)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => {
        const [year, month] = value.split("-");
        const date = new Date(Number(year), Number(month) - 1);
        const label = date.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        return { value, label };
      });
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return records;
    return records.filter((record) => {
      if (!record.date) return false;
      const value = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, "0")}`;
      return value === selectedMonth;
    });
  }, [records, selectedMonth]);

  const providersToDisplay = useMemo(
    () => (selectedProvider ? [selectedProvider] : PROVIDERS_ORDER),
    [selectedProvider]
  );

  const providerSummaries = useMemo(() => {
    const base = {
      hipto: { label: providerLabelMap.hipto, counts: createEmptyCounts(), sales: [] as LeadsSaleRecord[] },
      dolead: { label: providerLabelMap.dolead, counts: createEmptyCounts(), sales: [] as LeadsSaleRecord[] },
      "mars marketing": {
        label: providerLabelMap["mars marketing"],
        counts: createEmptyCounts(),
        sales: [] as LeadsSaleRecord[],
      },
    };

    filteredRecords.forEach((record) => {
      const provider = record.providerNormalized;
      if (!provider) return;
      base[provider].sales.push(record);
      base[provider].counts.internet += record.categoryFlags.internet;
      base[provider].counts.mobile += record.categoryFlags.mobile;
      base[provider].counts.internetSosh += record.categoryFlags.internetSosh;
      base[provider].counts.mobileSosh += record.categoryFlags.mobileSosh;
    });

    return base;
  }, [filteredRecords]);

  const donutData = useMemo(() => {
    const labels: string[] = [];
    const values: number[] = [];
    const colors: string[] = [];

    providersToDisplay.forEach((provider) => {
      const summary = providerSummaries[provider];
      const counts = summary.counts;
      const providerColorsArr = providerColors[provider];
      const categories: Array<[string, number]> = [
        ["Internet", counts.internet],
        ["Mobile", counts.mobile],
        ["Internet SOSH", counts.internetSosh],
        ["Mobile SOSH", counts.mobileSosh],
      ];

      categories.forEach(([label, value], index) => {
        if (value > 0) {
          labels.push(`${summary.label} – ${label}`);
          values.push(value);
          colors.push(providerColorsArr[index]);
        }
      });
    });

    if (!values.length) {
      return {
        labels: ["Aucune vente"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#1f2937"],
            borderWidth: 1,
          },
        ],
      };
    }

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 1,
        },
      ],
    };
  }, [providerSummaries, providersToDisplay]);

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: "#ffffff",
          },
        },
      },
    }),
    []
  );

  const totalCounts = useMemo(() => {
    return providersToDisplay.reduce(
      (acc, provider) => {
        const counts = providerSummaries[provider].counts;
        acc.internet += counts.internet;
        acc.mobile += counts.mobile;
        acc.internetSosh += counts.internetSosh;
        acc.mobileSosh += counts.mobileSosh;
        return acc;
      },
      { internet: 0, mobile: 0, internetSosh: 0, mobileSosh: 0 }
    );
  }, [providerSummaries, providersToDisplay]);

  const displayedRecords = useMemo(() => {
    if (!selectedProvider) return filteredRecords;
    return filteredRecords.filter(
      (record) => record.providerNormalized === selectedProvider
    );
  }, [filteredRecords, selectedProvider]);

  return (
    <section className="space-y-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Sales Leads</h1>
        <p className="text-sm text-blue-100/80">
          Historique complet des ventes leads (Hipto, Dolead, Mars marketing).
        </p>
      </header>

      <div className="rounded-3xl bg-white/10 p-6 text-white shadow-[0_22px_50px_rgba(3,24,93,0.35)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 text-white">
          <div>
            <h2 className="text-xl font-semibold text-white">Répartition globale</h2>
            <p className="text-sm text-blue-100/80">
              Données basées sur le filtre mois et les ventes importées depuis Firestore.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="leads-sales-month" className="text-sm text-blue-100/85">
                Filtrer par mois
              </label>
              <select
                id="leads-sales-month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:ring-blue-300"
              >
                <option value="">Tous les mois</option>
                {availableMonths.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="leads-sales-provider" className="text-sm text-blue-100/85">
                Fournisseur
              </label>
              <select
                id="leads-sales-provider"
                value={selectedProvider}
                onChange={(event) =>
                  setSelectedProvider(event.target.value as typeof selectedProvider)
                }
                className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:ring-blue-300"
              >
                <option value="">Tous</option>
                {PROVIDERS_ORDER.map((provider) => (
                  <option key={provider} value={provider}>
                    {providerLabelMap[provider]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="mx-auto w-full max-w-xs rounded-2xl bg-gradient-to-br from-blue-800 via-indigo-700 to-sky-500 p-5 text-white shadow-lg">
            <Doughnut data={donutData} options={donutOptions} />
          </div>
          <div className="flex-1 grid gap-4 sm:grid-cols-3">
            {providersToDisplay.map((providerKey) => {
              const summary = providerSummaries[providerKey];
              const counts = summary.counts;
              return (
                <div
                  key={providerKey}
                  className="rounded-xl border border-white/15 bg-white/5 p-4 text-white"
                >
                  <h3 className="text-sm font-semibold">{summary.label}</h3>
                  <dl className="mt-2 space-y-1 text-sm text-blue-100/80">
                    <div className="flex items-center justify-between">
                      <dt>Internet</dt>
                      <dd className="font-semibold text-white/90">{counts.internet}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Mobile</dt>
                      <dd className="font-semibold text-white/90">{counts.mobile}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Internet SOSH</dt>
                      <dd className="font-semibold text-white/90">{counts.internetSosh}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Mobile SOSH</dt>
                      <dd className="font-semibold text-white/90">{counts.mobileSosh}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-blue-100/80">
          <span className="rounded-full bg-white/10 px-3 py-1">
            🌐 Internet : {totalCounts.internet}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            📱 Mobile : {totalCounts.mobile}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            🟦 Internet SOSH : {totalCounts.internetSosh}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            🟩 Mobile SOSH : {totalCounts.mobileSosh}
          </span>
        </div>
      </div>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white/90">Historique des ventes</h2>
          <p className="text-sm text-blue-100/65">
            Liste des ventes issues de Firestore `leads_sales`.
          </p>
        </header>
        <LeadsSalesTableModule
          sales={displayedRecords}
          isLoading={loading}
        />
      </section>
    </section>
  );
};

export default AdminLeadsSalesPage;
