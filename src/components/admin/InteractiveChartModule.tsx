import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import salesService, { Sale } from "../../services/salesService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartCurve {
  id: string;
  name: string;
  offers: string[];
  sellers: string[];
  color: string;
}

interface InteractiveChartModuleProps {
  sales: Sale[];
  offers: { id: string; name: string }[];
  sellers: string[];
}

const COLORS = [
  "#3c964c",
  "#e74c3c",
  "#3498db",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#34495e",
  "#e91e63",
  "#00bcd4",
];

// Fonction utilitaire pour formater une date en YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Fonction utilitaire pour formater une date en format lisible
const formatDateForDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR");
};

const InteractiveChartModule: React.FC<InteractiveChartModuleProps> = ({
  sales,
  offers,
  sellers,
}) => {
  // Type de période sélectionné manuellement - par défaut "jour ouvré"
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  // Dates par défaut : tout le mois en cours (du 1er au dernier jour du mois)
  const currentDate = new Date();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // États pour la sélection de période avec date de début et date de fin
  const [startDate, setStartDate] = useState<string>(
    formatDateToYYYYMMDD(firstDayOfMonth)
  );
  const [endDate, setEndDate] = useState<string>(
    formatDateToYYYYMMDD(lastDayOfMonth)
  );

  const [curves, setCurves] = useState<ChartCurve[]>([
    {
      id: "1",
      name: "Courbe 1",
      offers: [],
      sellers: [],
      color: COLORS[0],
    },
  ]);
  const [showFilters, setShowFilters] = useState(false);

  // Fonction pour filtrer les ventes selon les critères d'une courbe
  const filterSalesForCurve = (curve: ChartCurve) => {
    return sales.filter((sale) => {
      // Filtre par offres (si spécifiées)
      if (curve.offers.length > 0 && !curve.offers.includes(sale.offer)) {
        return false;
      }

      // Filtre par vendeurs (si spécifiés)
      if (curve.sellers.length > 0 && !curve.sellers.includes(sale.name)) {
        return false;
      }

      return true;
    });
  };

  // La fonction getFilteredSalesByDateRange a été supprimée car elle n'était pas utilisée

  // Générer les périodes pour l'axe X en fonction de la plage de dates sélectionnée
  const getDateLabels = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    // Créer un tableau de dates entre startDate et endDate selon le type de période
    switch (period) {
      case "day":
        // Générer des dates journalières
        const currentDay = new Date(start);
        while (currentDay <= end) {
          // Ne pas inclure les weekends
          if (currentDay.getDay() !== 0 && currentDay.getDay() !== 6) {
            dates.push(
              currentDay.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              })
            );
          }
          currentDay.setDate(currentDay.getDate() + 1);
        }
        break;

      case "week":
        // Générer des semaines
        const startWeek = new Date(start);
        // Aller au lundi de la semaine
        const dayOfWeek = startWeek.getDay() || 7;
        startWeek.setDate(startWeek.getDate() - (dayOfWeek - 1));

        const currentWeek = new Date(startWeek);
        while (currentWeek <= end) {
          const weekEnd = new Date(currentWeek);
          weekEnd.setDate(currentWeek.getDate() + 6);

          dates.push(
            `${currentWeek.getDate()}/${
              currentWeek.getMonth() + 1
            } - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`
          );

          // Passer à la semaine suivante
          currentWeek.setDate(currentWeek.getDate() + 7);
        }
        break;

      case "month":
        // Générer des mois
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const currentMonth = new Date(startMonth);

        while (currentMonth <= end) {
          dates.push(
            currentMonth.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })
          );

          // Passer au mois suivant
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        break;
    }

    return dates;
  };

  // Calcul des données pour une courbe en fonction de la plage de dates
  const calculateCurveData = (curve: ChartCurve): (number | null)[] => {
    const filteredSalesByCriteria = filterSalesForCurve(curve);
    const dateLabels = getDateLabels();
    const counts: (number | null)[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Aujourd'hui à 23:59:59

    for (const label of dateLabels) {
      switch (period) {
        case "day": {
          // Convertir le label en date pour comparer avec aujourd'hui
          const [day, month] = label.split("/").map(Number);
          const year = new Date().getFullYear();
          const labelDate = new Date(year, month - 1, day);

          // Si la date est dans le futur, ajouter null (pas de tracé)
          if (labelDate > today) {
            counts.push(null);
            break;
          }

          // Trouver les ventes pour ce jour spécifique
          const dayCount = filteredSalesByCriteria.filter((sale) => {
            const saleDate = salesService.parseDate(sale.date);
            if (!saleDate) return false;

            return (
              saleDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              }) === label
            );
          }).length;

          counts.push(dayCount);
          break;
        }
        case "week": {
          // Extraire les dates de début et de fin de semaine du format "dd/mm - dd/mm"
          const [startWeekStr, endWeekStr] = label.split(" - ");
          const [startDay, startMonth] = startWeekStr.split("/").map(Number);
          const [endDay, endMonth] = endWeekStr.split("/").map(Number);

          const year = new Date(startDate).getFullYear();
          const weekStart = new Date(year, startMonth - 1, startDay);

          // Si la semaine commence dans le futur, ajouter null (pas de tracé)
          if (weekStart > today) {
            counts.push(null);
            break;
          }

          const weekEnd = new Date(year, endMonth - 1, endDay, 23, 59, 59, 999);

          const weekCount = filteredSalesByCriteria.filter((sale) => {
            const saleDate = salesService.parseDate(sale.date);
            if (!saleDate) return false;

            return saleDate >= weekStart && saleDate <= weekEnd;
          }).length;

          counts.push(weekCount);
          break;
        }
        case "month": {
          // Extraire le mois et l'année du format "mois année"
          const [monthName, yearStr] = label.split(" ");

          // Trouver l'index du mois à partir de son nom
          const months = Array.from({ length: 12 }, (_, i) =>
            new Date(2000, i, 1).toLocaleDateString("fr-FR", { month: "long" })
          );

          const monthIndex = months.findIndex(
            (m) => m.toLowerCase() === monthName.toLowerCase()
          );
          const year = parseInt(yearStr);

          if (monthIndex !== -1) {
            const monthStart = new Date(year, monthIndex, 1);

            // Si le mois commence dans le futur, ajouter null (pas de tracé)
            if (monthStart > today) {
              counts.push(null);
              break;
            }

            const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

            const monthCount = filteredSalesByCriteria.filter((sale) => {
              const saleDate = salesService.parseDate(sale.date);
              if (!saleDate) return false;

              return saleDate >= monthStart && saleDate <= monthEnd;
            }).length;

            counts.push(monthCount);
          } else {
            counts.push(0);
          }
          break;
        }
      }
    }

    return counts;
  };

  // Génération des données du graphique
  const getChartData = () => {
    const labels = getDateLabels();
    const datasets = curves.map((curve) => {
      const data = calculateCurveData(curve);

      return {
        label: curve.name,
        data,
        borderColor: curve.color,
        backgroundColor: curve.color + "20",
        tension: 0, // Lignes droites
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: curve.color,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        borderWidth: 2,
        spanGaps: false, // Ne pas connecter les points s'il y a des valeurs nulles (périodes futures)
      };
    });

    return { labels, datasets };
  };

  const addCurve = () => {
    const newCurve: ChartCurve = {
      id: Date.now().toString(),
      name: `Courbe ${curves.length + 1}`,
      offers: [],
      sellers: [],
      color: COLORS[curves.length % COLORS.length],
    };
    setCurves([...curves, newCurve]);
  };

  const removeCurve = (id: string) => {
    setCurves(curves.filter((curve) => curve.id !== id));
  };

  const updateCurve = (
    id: string,
    field: "offers" | "sellers",
    value: string[]
  ) => {
    setCurves(
      curves.map((curve) =>
        curve.id === id ? { ...curve, [field]: value } : curve
      )
    );
  };

  const updateCurveName = (id: string, name: string) => {
    setCurves(
      curves.map((curve) => (curve.id === id ? { ...curve, name } : curve))
    );
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    elements: {
      line: {
        tension: 0, // ✅ Force globalement les lignes droites
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#ccc",
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const label = context[0]?.label || "";
            return `${
              period === "day" ? "Jour" : period === "week" ? "Semaine" : "Mois"
            }: ${label}`;
          },
          label: (context) => {
            const datasetLabel = context.dataset.label || "";
            const value = context.parsed.y;
            return `${datasetLabel}: ${value} vente${value > 1 ? "s" : ""}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text:
            period === "day"
              ? "Jours"
              : period === "week"
              ? "Semaines"
              : "Mois",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Nombre de ventes",
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  };

  // Statistiques rapides
  const totalSales = sales.length;
  const activeCurves = curves.filter(
    (c) => c.offers.length > 0 || c.sellers.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Type de période (jour, semaine, mois) */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value as "day" | "week" | "month")
                }
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
              >
                <option value="day">Par jour ouvré</option>
                <option value="week">Par semaine</option>
                <option value="month">Par mois</option>
              </select>
            </div>

            {/* Sélecteur de date de début */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Du:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
              />
            </div>

            {/* Sélecteur de date de fin */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Au:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
              />
            </div>

            {/* Raccourcis de périodes */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => {
                  // 7 derniers jours
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  setStartDate(formatDateToYYYYMMDD(start));
                  setEndDate(formatDateToYYYYMMDD(end));
                }}
                className="px-2 py-1 text-xs border rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                7 derniers jours
              </button>
              <button
                onClick={() => {
                  // 30 derniers jours
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 30);
                  setStartDate(formatDateToYYYYMMDD(start));
                  setEndDate(formatDateToYYYYMMDD(end));
                }}
                className="px-2 py-1 text-xs border rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                30 derniers jours
              </button>
              <button
                onClick={() => {
                  // Ce mois-ci (du 1er au dernier jour)
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  const end = new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0
                  );
                  setStartDate(formatDateToYYYYMMDD(start));
                  setEndDate(formatDateToYYYYMMDD(end));
                }}
                className="px-2 py-1 text-xs border rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Ce mois
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <span className="ml-2 font-semibold text-cactus-600">
              • Période: {formatDateForDisplay(startDate)} au{" "}
              {formatDateForDisplay(endDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
              showFilters
                ? "bg-cactus-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <span>⚙️</span>
            Filtres
          </button>
          <button
            onClick={addCurve}
            className="flex items-center gap-2 px-3 py-1 bg-cactus-600 hover:bg-cactus-700 text-white rounded-md text-sm transition-colors"
          >
            <span>➕</span>
            Ajouter courbe
          </button>
        </div>
      </div>

      {/* Filtres des courbes */}
      {showFilters && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          {curves.map((curve) => (
            <div
              key={curve.id}
              className="flex items-start gap-4 p-3 bg-white rounded-md border"
            >
              <div
                className="w-4 h-4 rounded-full mt-1"
                style={{ backgroundColor: curve.color }}
              ></div>

              <div className="flex-1 space-y-3">
                {/* Nom de la courbe */}
                <div>
                  <input
                    type="text"
                    value={curve.name}
                    onChange={(e) => updateCurveName(curve.id, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                    placeholder="Nom de la courbe"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offres
                    </label>
                    <select
                      multiple
                      value={curve.offers}
                      onChange={(e) =>
                        updateCurve(
                          curve.id,
                          "offers",
                          Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                      size={Math.min(offers.length, 4)}
                    >
                      {offers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Maintenez Ctrl/Cmd pour sélectionner plusieurs
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendeurs
                    </label>
                    <select
                      multiple
                      value={curve.sellers}
                      onChange={(e) =>
                        updateCurve(
                          curve.id,
                          "sellers",
                          Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                      size={Math.min(sellers.length, 4)}
                    >
                      {sellers.map((seller) => (
                        <option key={seller} value={seller}>
                          {seller}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Maintenez Ctrl/Cmd pour sélectionner plusieurs
                    </p>
                  </div>
                </div>

                {/* Aperçu des filtres */}
                <div className="text-xs text-gray-600">
                  {curve.offers.length === 0 && curve.sellers.length === 0 && (
                    <span className="text-orange-600">
                      ⚠️ Aucun filtre - toutes les ventes
                    </span>
                  )}
                  {curve.offers.length > 0 && (
                    <span>
                      📦 {curve.offers.length} offre
                      {curve.offers.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {curve.offers.length > 0 && curve.sellers.length > 0 && (
                    <span> • </span>
                  )}
                  {curve.sellers.length > 0 && (
                    <span>
                      👤 {curve.sellers.length} vendeur
                      {curve.sellers.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {curves.length > 1 && (
                <button
                  onClick={() => removeCurve(curve.id)}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Supprimer cette courbe"
                >
                  <span>❌</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Graphique */}
      <div className="h-80 bg-white p-4 rounded-lg border">
        <div className="mb-2 text-sm text-center text-gray-500 bg-gray-50 py-1 px-2 rounded-md">
          Affichage des données du {formatDateForDisplay(startDate)} au{" "}
          {formatDateForDisplay(endDate)}
          {period === "day" && " (par jour ouvré)"}
          {period === "week" && " (par semaine)"}
          {period === "month" && " (par mois)"}
        </div>
        <Line data={getChartData()} options={chartOptions} />
      </div>
    </div>
  );
};

export default InteractiveChartModule;
