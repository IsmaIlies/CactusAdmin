import { FormEvent, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  addLeadOrders,
  LeadOrderProvider,
  LeadsOrderRecord,
  PROVIDERS,
  subscribeToLeadOrders,
} from "../../../services/leadsOrdersService";

const providerLabels: Record<LeadOrderProvider, string> = {
  hipto: "Hipto",
  dolead: "Dolead",
};

const formatDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date: Date): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

const monthValueFromDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const AdminLeadsChecklistPage = () => {
  const today = useMemo(() => new Date(), []);
  const [records, setRecords] = useState<LeadsOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyView, setHistoryView] = useState<"day" | "week" | "month">("day");

  const initialDateValue = useMemo(() => formatDateInput(today), [today]);
  const initialMonthValue = useMemo(() => monthValueFromDate(today), [today]);

  const [formDate, setFormDate] = useState(initialDateValue);
  const [quantities, setQuantities] = useState<Record<LeadOrderProvider, string>>({
    hipto: "",
    dolead: "",
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthValue);

  useEffect(() => {
    const unsubscribe = subscribeToLeadOrders(
      (orders) => {
        setRecords(orders);
        setLoading(false);
      },
      (subscriptionError) => {
        console.error("Erreur lors du chargement des commandes de leads", subscriptionError);
        setError("Impossible de récupérer l'historique des commandes.");
        setRecords([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const availableMonths = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        value: string;
        label: string;
      }
    >();

    records.forEach((record) => {
      if (!record.date) return;
      const value = monthValueFromDate(record.date);
      if (monthMap.has(value)) return;
      const label = record.date.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
      monthMap.set(value, { value, label });
    });

    return Array.from(monthMap.values()).sort((a, b) => b.value.localeCompare(a.value));
  }, [records]);

  useEffect(() => {
    if (availableMonths.length === 0) {
      if (selectedMonth !== "") {
        setSelectedMonth("");
      }
      return;
    }

    if (!selectedMonth) {
      setSelectedMonth(availableMonths[0].value);
      return;
    }

    if (!availableMonths.some((option) => option.value === selectedMonth)) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableMonths, selectedMonth]);

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return records;
    return records.filter((record) => {
      if (!record.date) return false;
      return monthValueFromDate(record.date) === selectedMonth;
    });
  }, [records, selectedMonth]);

  const dailyHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        iso: string;
        date: Date;
        formatted: string;
        hipto: number;
        dolead: number;
        total: number;
      }
    >();

    filteredRecords.forEach((record) => {
      if (!record.date || !record.provider) return;
      const dateKey = formatDateInput(record.date);
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          iso: dateKey,
          date: record.date,
          formatted: formatDateDisplay(record.date),
          hipto: 0,
          dolead: 0,
          total: 0,
        });
      }
      const entry = map.get(dateKey)!;
      entry[record.provider] += record.quantity;
      entry.total += record.quantity;
    });

    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredRecords]);

  const weeklyHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        iso: string;
        startDate: Date;
        endDate: Date;
        label: string;
        hipto: number;
        dolead: number;
        total: number;
      }
    >();

    const formatter = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    });

    filteredRecords.forEach((record) => {
      if (!record.date || !record.provider) return;
      const current = new Date(
        record.date.getFullYear(),
        record.date.getMonth(),
        record.date.getDate()
      );
      const dayOfWeek = (current.getDay() + 6) % 7; // 0 = lundi
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const iso = formatDateInput(weekStart);
      if (!map.has(iso)) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const label = `Semaine du ${formatter.format(weekStart)} au ${formatter.format(weekEnd)}`;
        map.set(iso, {
          iso,
          startDate: weekStart,
          endDate: weekEnd,
          label,
          hipto: 0,
          dolead: 0,
          total: 0,
        });
      }
      const entry = map.get(iso)!;
      entry[record.provider] += record.quantity;
      entry.total += record.quantity;
    });

    return Array.from(map.values()).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [filteredRecords]);

  const monthlyHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        value: string;
        label: string;
        hipto: number;
        dolead: number;
        total: number;
      }
    >();

    records.forEach((record) => {
      if (!record.date || !record.provider) return;
      const value = monthValueFromDate(record.date);
      if (!map.has(value)) {
        const label = record.date.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        map.set(value, { value, label, hipto: 0, dolead: 0, total: 0 });
      }
      const entry = map.get(value)!;
      entry[record.provider] += record.quantity;
      entry.total += record.quantity;
    });

    return Array.from(map.values()).sort((a, b) => b.value.localeCompare(a.value));
  }, [records]);

  const totalOrderedForSelectedMonth = useMemo(() => {
    return dailyHistory.reduce(
      (acc, entry) => {
        acc.hipto += entry.hipto;
        acc.dolead += entry.dolead;
        acc.total += entry.total;
        return acc;
      },
      { hipto: 0, dolead: 0, total: 0 }
    );
  }, [dailyHistory]);

  const totalsForWeeklyView = useMemo(() => {
    return weeklyHistory.reduce(
      (acc, entry) => {
        acc.hipto += entry.hipto;
        acc.dolead += entry.dolead;
        acc.total += entry.total;
        return acc;
      },
      { hipto: 0, dolead: 0, total: 0 }
    );
  }, [weeklyHistory]);

  const totalsForMonthlyView = useMemo(() => {
    return monthlyHistory.reduce(
      (acc, entry) => {
        acc.hipto += entry.hipto;
        acc.dolead += entry.dolead;
        acc.total += entry.total;
        return acc;
      },
      { hipto: 0, dolead: 0, total: 0 }
    );
  }, [monthlyHistory]);

  const activeTotals = useMemo(() => {
    if (historyView === "day") return totalOrderedForSelectedMonth;
    if (historyView === "week") return totalsForWeeklyView;
    return totalsForMonthlyView;
  }, [historyView, totalOrderedForSelectedMonth, totalsForWeeklyView, totalsForMonthlyView]);

  const handleQuantityChange = (provider: LeadOrderProvider, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setQuantities((prev) => ({ ...prev, [provider]: sanitized }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitStatus("idle");

    const parsedDate = new Date(`${formDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      setSubmitStatus("error");
      setSubmitError("Date invalide. Veuillez sélectionner une date valide.");
      return;
    }

    const payload = PROVIDERS.map((provider) => ({
      provider,
      date: parsedDate,
      quantity: Number(quantities[provider] ?? 0),
    }));

    if (payload.every((item) => !item.quantity)) {
      setSubmitStatus("error");
      setSubmitError("Veuillez saisir un nombre de leads commandés pour au moins un fournisseur.");
      return;
    }

    try {
      setIsSubmitting(true);
      await addLeadOrders(payload);
      setQuantities({ hipto: "", dolead: "" });
      setSubmitStatus("success");
    } catch (submissionError) {
      console.error(
        "Erreur lors de l'enregistrement des commandes de leads",
        submissionError
      );
      setSubmitStatus("error");
      if (submissionError instanceof FirebaseError) {
        if (submissionError.code === "permission-denied") {
          setSubmitError(
            "Accès refusé. Vérifiez vos droits (rôle admin/direction/superviseur)."
          );
        } else {
          setSubmitError(
            `Erreur Firebase (${submissionError.code}). Réessayez ou contactez le support.`
          );
        }
      } else if (submissionError instanceof Error) {
        setSubmitError(submissionError.message);
      } else {
        setSubmitError("Impossible d'enregistrer les commandes pour le moment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-10 text-blue-100/80">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Leads commandés</h1>
        <p className="text-sm text-blue-100/70">
          Saisissez les leads commandés par fournisseur et consultez l'historique par jour, semaine et mois.
        </p>
      </header>

      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white/90">Nouvelle commande</h2>
          <p className="text-sm text-blue-100/65">
            Inscrivez la date d'achat et le volume de leads commandés pour chaque fournisseur (Hipto et Dolead).
          </p>
        </header>
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white/8 p-6 shadow-[0_22px_50px_rgba(3,24,93,0.35)] backdrop-blur"
        >
          <div className="grid gap-6 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-white/90">
              <span>Date d'achat</span>
              <input
                type="date"
                value={formDate}
                onChange={(event) => setFormDate(event.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-base text-white focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </label>
            {PROVIDERS.map((provider) => (
              <label
                key={provider}
                className="flex flex-col gap-2 text-sm font-medium text-white/90"
              >
                <span>{providerLabels[provider]}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantities[provider]}
                  onChange={(event) => handleQuantityChange(provider, event.target.value)}
                  placeholder="0"
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-base text-white focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer la commande"}
            </button>
            {submitStatus === "success" && (
              <span className="text-sm font-medium text-emerald-300">
                Commande enregistrée avec succès.
              </span>
            )}
            {submitStatus === "error" && submitError && (
              <span className="text-sm font-medium text-red-300">{submitError}</span>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white/90">Historique des commandes</h2>
              <p className="text-sm text-blue-100/65">
                Explorez les volumes par jour, semaine ou mois selon vos besoins.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/10 p-1">
                {[
                  { value: "day" as const, label: "Jour" },
                  { value: "week" as const, label: "Semaine" },
                  { value: "month" as const, label: "Mois" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setHistoryView(option.value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      historyView === option.value
                        ? "bg-white text-blue-900 shadow"
                        : "text-white/75 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {historyView !== "month" && (
                <label className="flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-blue-100/80">
                  <span>Mois</span>
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm text-white focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  >
                    {availableMonths.length === 0 ? (
                      <option value="">Aucun mois disponible</option>
                    ) : (
                      availableMonths.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-blue-100/70">Hipto</p>
              <p className="mt-1 text-2xl font-semibold text-white">{activeTotals.hipto}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-blue-100/70">Dolead</p>
              <p className="mt-1 text-2xl font-semibold text-white">{activeTotals.dolead}</p>
            </div>
            <div className="rounded-2xl border border-blue-300/30 bg-gradient-to-br from-blue-500/30 to-cyan-400/30 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/80">Total</p>
              <p className="mt-1 text-2xl font-semibold text-white">{activeTotals.total}</p>
            </div>
          </div>
        </header>

        <div className="overflow-hidden rounded-3xl bg-white/8 text-blue-100/80 shadow-[0_22px_50px_rgba(3,24,93,0.35)] backdrop-blur">
          {loading ? (
            <div className="px-6 py-8 text-blue-100/70">Chargement de l'historique…</div>
          ) : error ? (
            <div className="px-6 py-8 text-red-300">{error}</div>
          ) : historyView === "day" ? (
            dailyHistory.length === 0 ? (
              <div className="px-6 py-8 text-blue-100/70">
                Aucun lead commandé pour le mois sélectionné.
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wider text-blue-100/70">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Hipto</th>
                    <th className="px-6 py-4 font-semibold">Dolead</th>
                    <th className="px-6 py-4 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyHistory.map((entry) => (
                    <tr key={entry.iso} className="border-t border-white/10">
                      <td className="px-6 py-4 text-white/90">{entry.formatted}</td>
                      <td className="px-6 py-4">{entry.hipto}</td>
                      <td className="px-6 py-4">{entry.dolead}</td>
                      <td className="px-6 py-4 font-semibold text-white/90">{entry.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : historyView === "week" ? (
            weeklyHistory.length === 0 ? (
              <div className="px-6 py-8 text-blue-100/70">
                Aucun lead commandé pour le mois sélectionné.
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wider text-blue-100/70">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Semaine</th>
                    <th className="px-6 py-4 font-semibold">Hipto</th>
                    <th className="px-6 py-4 font-semibold">Dolead</th>
                    <th className="px-6 py-4 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyHistory.map((entry) => (
                    <tr key={entry.iso} className="border-t border-white/10">
                      <td className="px-6 py-4 text-white/90">{entry.label}</td>
                      <td className="px-6 py-4">{entry.hipto}</td>
                      <td className="px-6 py-4">{entry.dolead}</td>
                      <td className="px-6 py-4 font-semibold text-white/90">{entry.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : monthlyHistory.length === 0 ? (
            <div className="px-6 py-8 text-blue-100/70">
              Aucun historique mensuel disponible pour le moment.
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/10 text-xs uppercase tracking-wider text-blue-100/70">
                <tr>
                  <th className="px-6 py-4 font-semibold">Mois</th>
                  <th className="px-6 py-4 font-semibold">Hipto</th>
                  <th className="px-6 py-4 font-semibold">Dolead</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyHistory.map((entry) => (
                  <tr key={entry.value} className="border-t border-white/10">
                    <td className="px-6 py-4 text-white/90">{entry.label}</td>
                    <td className="px-6 py-4">{entry.hipto}</td>
                    <td className="px-6 py-4">{entry.dolead}</td>
                    <td className="px-6 py-4 font-semibold text-white/90">{entry.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </section>
  );
};

export default AdminLeadsChecklistPage;
