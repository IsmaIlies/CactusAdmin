import React, { useState, useEffect } from "react";
import CallClosuresPanel, { CallClosure } from "../components/CallClosuresPanel";
// Référentiel des statuts d'appel (constant en dehors du composant)
export const callClosures: CallClosure[] = [
  { code: "CAPLUS", description: "CAPLUS", type: "CA+" },
  { code: "CAPLUSAT", description: "CAPLUSAT", type: "CA+" },
  { code: "ECC", description: "ENGAGE CHEZ CONCURRENT", type: "CA-" },
  { code: "MO", description: "MECONTENT ORANGE", type: "CA-" },
  { code: "RCB", description: "REFUS COORDONNEES BANCAIRES", type: "CA-" },
  { code: "RETR", description: "RETRACTATION", type: "CA-" },
  { code: "RRENG", description: "REFUSE DE SE REENGAGER", type: "CA-" },
  { code: "RIO", description: "REFUS RIO / PORTABILITE", type: "CA-" },
  { code: "ROAC", description: "REFUS OFFRE AVANT CONSENTEMENT", type: "CA-" },
  { code: "ROFC", description: "SATISFAIT OFFRE CONCURRENCE", type: "CA-" },
  { code: "ROFI", description: "REFUS OFFRE", type: "CA-" },
  { code: "ROIC", description: "INTERESSE PAR OFFRE CONCURRENCE", type: "CA-" },
  { code: "ROIN", description: "NON ELIGIBLE TV", type: "CA-" },
  { code: "ROSI", description: "REFUS OFFRE SIE / KO TECHNIQUE", type: "CA-" },
  { code: "ROSIC", description: "REFUS OFFRE / SPECIFICITES COMMERCIALES", type: "CA-" },
  { code: "ROT", description: "REFUS TARIF", type: "CA-" },
  { code: "ROVB", description: "REFUS VEUT ALLER BOUTIQUE", type: "CA-" },
  { code: "ADCO", description: "A DEJA L'OFFRE", type: "CNAI" },
  { code: "ADNE", description: "A DEMENAGE NON ELIGIBLE", type: "CNAI" },
  { code: "BAR", description: "BARRAGE", type: "CNAI" },
  { code: "CESA", description: "CESSATION D'ACTIVITE", type: "CNAI" },
  { code: "DI", description: "DIALOGUE IMPOSSIBLE", type: "CNAI" },
  { code: "DOU", description: "DOUBLON APPEL", type: "CNAI" },
  { code: "FAU", description: "FAUX NUMERO", type: "CNAI" },
  { code: "FAX", description: "FAX", type: "CNAI" },
  { code: "GEL", description: "GEL - NE PAS APPELER ORANGE", type: "CNAI" },
  { code: "HC", description: "AUTRE CAS (HORS CIBLE)", type: "CNAI" },
  { code: "INJ", description: "INJOIGNABLE", type: "CNAI" },
  { code: "ITFI", description: "INSTALLATION TECHNIQUE FIBRE IMPOSSIBLE", type: "CNAI" },
  { code: "NEF", description: "NON ELIGIBLE FIBRE", type: "CNAI" },
  { code: "NPAI", description: "N'HABITE PAS A L'ADRESSE INDIQUEE", type: "CNAI" },
  { code: "NPI", description: "PAS EQUIPE PC", type: "AUTRE" },
  { code: "NR", description: "NE PLUS CONTACTER PACITEL", type: "CNAI" },
  { code: "RE", description: "RAPPEL", type: "CALL" },
  { code: "SND", description: "SITE NON DECISIONNAIRE", type: "CNAI" },
  { code: "SR", description: "SOUHAITE RESILIER", type: "CA-" },
  { code: "SUP65", description: "SUP65 / NON USAGE", type: "CA-" },
  { code: "CALL2", description: "CALL FINALISATION VENTE", type: "CALL" },
];
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebase";
import salesService, {
  Sale,
  OFFERS,
  ContactsArgues,
  OrderStatus,
} from "../services/salesService";
import SalesFilters from "../components/admin/SalesFilters";
import SalesTable from "../components/admin/SalesTable";
import EditSaleModal from "../components/admin/EditSaleModal";
import EmailRecipientsModal from "../components/admin/EmailRecipientsModal";
import ContactsArguesModal from "../components/admin/ContactsArguesModal";
import { Mail, Download, Calendar, Save, BarChart3 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
// EntityContext removed per request

// --- Normaliseurs de statuts ---

// 1) Mapping direct du basketStatus (côté page Ventes)
const mapBasketStatusToOrderStatus = (basket: any): OrderStatus => {
  const raw = (basket ?? "").toString().toUpperCase().trim();

  switch (raw) {
    case "OK":
      return "valide";
    case "VALID FINALE":
    case "VALIDATION FINALE":
    case "VALID SOFT":
    case "VALIDATION SOFT":
      return "validation_soft"; // renommé (anciennement validation_finale)
    case "ATT":
    case "EN ATTENTE":
    case "ATTENTE":
      return "en_attente";
    case "PROBLÈME IBAN":
    case "PROBLEME IBAN":
    case "PROBLEME_IBAN":
      return "probleme_iban";
    case "ROAC":
      return "roac";
    default:
      // On repasse par la normalisation générique (au cas où d'autres valeurs)
      return normalizeOrderStatus(raw);
  }
};

// 2) Normalisation générique (compat legacy)
const normalizeOrderStatus = (value: any): OrderStatus => {
  if (value === true) return "valide";
  if (typeof value === "number") return value > 0 ? "valide" : "en_attente";

  const raw = (value ?? "").toString().toLowerCase();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  const isValid = [
    "valide",
    "validee",
    "valid",
    "validated",
    "approve",
    "approved",
    "ok",
    "done",
    "oui",
    "yes",
    "true",
    "1",
    "completed",
    "complete",
  ].includes(normalized);
  if (isValid) return "valide";

  if (
    normalized.includes("iban") ||
    normalized === "probleme_iban" ||
    normalized === "problemeiban"
  ) {
    return "probleme_iban";
  }
  if (normalized.includes("final") || normalized.includes("soft")) return "validation_soft"; // backward compat
  if (normalized.includes("roac")) return "roac";

  const isPending = [
    "en_attente",
    "attente",
    "enattente",
    "pending",
    "en_cours",
    "processing",
    "wait",
    "waiting",
    "non",
    "false",
    "0",
    "todo",
  ].includes(normalized);
  if (isPending) return "en_attente";

  if (normalized.includes("valid")) return "valide";
  if (normalized.includes("attent") || normalized.includes("pend"))
    return "en_attente";

  return "en_attente";
};

const AdminSalesPage: React.FC = () => {
  const { user } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWeeklyReport, setSendingWeeklyReport] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  // Panel d'affichage des codes de clôture
  const [showClosuresPanel, setShowClosuresPanel] = useState(false);

  // Filtres
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  // Par défaut : on affiche uniquement les ventes validées (espace TA)
  const [selectedOrderStatus, setSelectedOrderStatus] =
    useState<OrderStatus[]>(["valide"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Contacts argumentés
  const [contactsArgues, setContactsArgues] = useState<string>("0");
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [contactsArguesHistory, setContactsArguesHistory] = useState<ContactsArgues[]>([]);
  const [loadingContactsArgues, setLoadingContactsArgues] = useState(true);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [savingContactsArgues, setSavingContactsArgues] = useState(false);
  const [periodContactsArgues, setPeriodContactsArgues] = useState<number>(0);

  // --- Écoute temps réel des ventes (avec normalisation basketStatus → orderStatus) ---
  useEffect(() => {
    setLoading(true);
    setError("");

  const salesQuery = query(collection(db, "sales"), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        const salesData: Sale[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          salesData.push({
            id: doc.id,
            ...(data as any),
          } as Sale);
        });

        const normalized: Sale[] = salesData.map((s: any) => {
          // 1) si on a un basketStatus (cas page Ventes), on mappe directement
          const basket =
            s?.basketStatus ??
            s?.basket_status ??
            s?.statut_panier ??
            s?.panierStatut;

          let orderStatus: OrderStatus | undefined;

          if (basket != null && basket !== "") {
            orderStatus = mapBasketStatusToOrderStatus(basket);
          } else {
            // 2) sinon on tente les champs historiques
            const candidateStatus =
              s?.orderStatus ??
              s?.status ??
              s?.order_status ??
              s?.statut ??
              s?.statut_commande ??
              s?.status_commande ??
              (s?.consent === "yes" || s?.consentement === "yes"
                ? "valide"
                : undefined);

            orderStatus = normalizeOrderStatus(candidateStatus);
          }

          return {
            ...s,
            orderStatus, // champ utilisé par les filtres/table Admin
          } as Sale;
        });

        // No entity-based filtering: show all sales
        setSales(normalized);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur lors de l'écoute des ventes:", err);
        setError(err.message || "Erreur lors du chargement des ventes");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Charger les contacts argumentés
  useEffect(() => {
    const fetchContactsArgues = async () => {
      try {
        setLoadingContactsArgues(true);
        const today = new Date().toISOString().split("T")[0];
        // No entity-based filtering: sum all entries
        const listToday = await salesService.getContactsArguesForPeriod(today, today);
        const todayTotal = listToday.reduce((sum, d) => sum + (d.count || 0), 0);
        setContactsArgues(todayTotal.toString());

        const recentAll = await salesService.getRecentContactsArgues();
        setContactsArguesHistory(recentAll);
      } catch (error) {
        console.error("Erreur lors du chargement des contacts argumentés:", error);
      } finally {
        setLoadingContactsArgues(false);
      }
    };
    fetchContactsArgues();
  }, []);

  // Filtrage via service (s'appuie sur sale.orderStatus)
  useEffect(() => {
    const filters = {
      offers: selectedOffers.length > 0 ? selectedOffers : undefined,
      sellers: selectedSellers.length > 0 ? selectedSellers : undefined,
      orderStatus: selectedOrderStatus.length > 0 ? selectedOrderStatus : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    const filtered = salesService.filterSales(sales, filters);
    setFilteredSales(filtered);
  }, [sales, selectedOffers, selectedSellers, selectedOrderStatus, startDate, endDate]);

  // Calcul CA période
  useEffect(() => {
    const calculatePeriodContactsArgues = async () => {
      try {
        if (contactsArguesHistory.length === 0) return;
        const today = new Date().toISOString().split("T")[0];
        let filteredContacts: ContactsArgues[] = [];

        if (startDate && endDate) {
          filteredContacts = contactsArguesHistory.filter(
            (ca) => ca.date >= startDate && ca.date <= endDate
          );
        } else if (startDate && !endDate) {
          filteredContacts = contactsArguesHistory.filter(
            (ca) => ca.date >= startDate && ca.date <= today
          );
        } else if (!startDate && endDate) {
          filteredContacts = contactsArguesHistory.filter((ca) => ca.date <= endDate);
        } else {
          filteredContacts = [...contactsArguesHistory];
        }

        if (filteredContacts.length === 0 && (startDate || endDate)) {
          const caData = await salesService.getContactsArguesForPeriod(startDate, endDate);
          filteredContacts = caData;
        }

        const total = filteredContacts.reduce((sum, ca) => sum + ca.count, 0);
        setPeriodContactsArgues(total);
      } catch (error) {
        console.error("Erreur lors du calcul des contacts argumentés:", error);
      }
    };

    calculatePeriodContactsArgues();
  }, [contactsArguesHistory, startDate, endDate]);

  const sellers = salesService.getSellers(sales);

  const handleClearFilters = () => {
    setSelectedOffers([]);
    setSelectedSellers([]);
    setSelectedOrderStatus(["valide"]); // défaut TA
    setStartDate("");
    setEndDate("");
  };

  const handleEditSale = async (saleId: string, updatedData: Partial<Sale>) => {
    try {
      await salesService.updateSale(saleId, updatedData);
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, ...updatedData } : sale
        )
      );
      setEditingSale(null);
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) {
      try {
        await salesService.deleteSale(saleId);
        setSales((prev) => prev.filter((sale) => sale.id !== saleId));
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const periodContactsNumber = periodContactsArgues || 0;
  const conversionRate =
    periodContactsNumber > 0
      ? ((filteredSales.length / periodContactsNumber) * 100).toFixed(1)
      : "0";

  const handleSendRecap = async (recipients: string[]) => {
    try {
      setSendingEmail(true);
      const functions = getFunctions(app, "europe-west9");
      const sendSalesRecap = httpsCallable(functions, "sendSalesRecap");

      let period = "";
      if (startDate && endDate) {
        period =
          startDate === endDate
            ? `Le ${new Date(startDate).toLocaleDateString("fr-FR")}`
            : `Du ${new Date(startDate).toLocaleDateString(
                "fr-FR"
              )} au ${new Date(endDate).toLocaleDateString("fr-FR")}`;
      } else if (startDate) {
        period = `À partir du ${new Date(startDate).toLocaleDateString("fr-FR")}`;
      } else if (endDate) {
        period = `Jusqu'au ${new Date(endDate).toLocaleDateString("fr-FR")}`;
      } else {
        period = "Toutes les ventes";
      }

      const caForPeriod = periodContactsNumber.toString();

      const result = await sendSalesRecap({
        salesData: filteredSales,
        contactsArgues: caForPeriod,
        period,
        recipients,
      });

      const data = result.data as { success: boolean; message: string };
      if (data.success) {
        alert("✅ " + data.message);
        setShowEmailModal(false);
      } else {
        alert("❌ Erreur lors de l'envoi du récapitulatif");
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi du récapitulatif:", error);
      alert("❌ Erreur: " + (error.message || "Erreur lors de l'envoi du récapitulatif"));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWeeklyReport = async (recipients: string[]) => {
    try {
      setSendingWeeklyReport(true);
      const functions = getFunctions(app, "europe-west9");
      const sendWeeklyReport = httpsCallable(functions, "sendWeeklyReport");

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Ventes du mois courant avec statut "valide"
      const monthSales = sales.filter((sale) => {
        const saleDate = salesService.parseDate(sale.date);
        if (!saleDate || (sale as any).orderStatus !== "valide") return false;
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      });

      const monthContactsArgues = await salesService.getContactsArguesForPeriod(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );

      const filteredContactsArgues = monthContactsArgues.filter((ca) => {
        const caDate = new Date(ca.date);
        return (
          caDate.getMonth() === now.getMonth() &&
          caDate.getFullYear() === now.getFullYear()
        );
      });

      const result = await sendWeeklyReport({
        salesData: monthSales,
        contactsArguesData: filteredContactsArgues,
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
        recipients,
      });

      const data = result.data as { success: boolean; message: string };
      if (data.success) {
        alert("✅ " + data.message);
        setShowWeeklyReportModal(false);
      } else {
        alert("❌ Erreur lors de l'envoi du rapport hebdomadaire");
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi du rapport hebdomadaire:", error);
      alert("❌ Erreur: " + (error.message || "Erreur lors de l'envoi du rapport hebdomadaire"));
    } finally {
      setSendingWeeklyReport(false);
    }
  };

  const handleOpenEmailModal = () => setShowEmailModal(true);
  const handleOpenWeeklyReportModal = () => setShowWeeklyReportModal(true);

  const handleExportCSV = () => {
    const csvContent = salesService.exportToCSV(filteredSales);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ventes_canal_plus_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWhatsApp = () => {
    const numero = "33641039226"; // format international sans +
    const message = `Récapitulatif Canal+\nVentes : ${filteredSales.length}\nContacts argumentés : ${periodContactsNumber}\nTaux de concrétisation : ${conversionRate}%`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleContactsChange = (value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setContactsArgues(value);
    }
  };
  const handleContactsBlur = () => {
    setIsEditingContacts(false);
    if (contactsArgues === "") setContactsArgues("0");
  };
  const handleContactsFocus = () => setIsEditingContacts(true);

  const handleSaveContactsArgues = async () => {
    try {
      setSavingContactsArgues(true);
      const today = new Date().toISOString().split("T")[0];
      const count = parseInt(contactsArgues) || 0;
  await salesService.saveContactsArgues(today, count, (user as any)?.uid);
  const updatedHistory = await salesService.getRecentContactsArgues();
      setContactsArguesHistory(updatedHistory);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des CA:", error);
      alert("Erreur lors de l'enregistrement des contacts argumentés");
    } finally {
      setSavingContactsArgues(false);
    }
  };

  const handleSaveHistoricalContactsArgues = async (date: string, count: number) => {
    try {
  await salesService.saveContactsArgues(date, count, (user as any)?.uid);
  const updatedHistory = await salesService.getRecentContactsArgues();
      setContactsArguesHistory(updatedHistory);
      const today = new Date().toISOString().split("T")[0];
      if (date === today) setContactsArgues(count.toString());
      return Promise.resolve();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des CA historiques:", error);
      return Promise.reject(error);
    }
  };

  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Erreur</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des ventes</h1>
          <div className="flex items-center gap-2 bg-black text-white px-3 py-1 rounded-full text-sm">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Logo_Canal%2B_1995.svg/1200px-Logo_Canal%2B_1995.svg.png"
              alt="Canal+"
              className="h-4 w-auto"
            />
            <span className="font-medium">Mission Canal+</span>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-cactus-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ventes Canal+ listées</p>
                <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CA + Taux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <span className="text-2xl">🧮</span>
                </div>
                <div className="ml-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Contacts argumentés aujourd'hui
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={contactsArgues}
                      onChange={(e) => handleContactsChange(e.target.value)}
                      onFocus={handleContactsFocus}
                      onBlur={handleContactsBlur}
                      className={`text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 focus:outline-none transition-colors ${
                        isEditingContacts
                          ? "text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-300"
                          : "text-gray-900"
                      }`}
                      style={{ width: `${Math.max(contactsArgues.length * 20, 60)}px` }}
                      placeholder="0"
                    />
                    <button
                      onClick={handleSaveContactsArgues}
                      disabled={savingContactsArgues}
                      className="flex items-center gap-1 text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {savingContactsArgues ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Save size={12} />
                      )}
                      {savingContactsArgues ? "..." : "Enregistrer"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditingContacts ? "Tapez un nombre puis enregistrez" : "Cliquez pour modifier"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowContactsModal(true)}
                className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 py-1 px-2 rounded hover:bg-gray-200 transition-colors"
              >
                <Calendar size={12} />
                Historique CA
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taux de concrétisation</p>
                <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
                <p className="text-xs text-gray-500">
                  {filteredSales.length} ventes / {periodContactsNumber} contacts argumentés{" "}
                  {startDate || endDate ? "sur la période" : "au total"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4"></div>
        <div className="flex items-center gap-2">
          {/* Bouton animé pour ouvrir le panel des codes de clôture */}
          <button
            onClick={() => setShowClosuresPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cactus-500 via-cactus-400 to-cactus-600 text-white rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
            style={{ animation: "pulse 1.5s infinite" }}
          >
            <svg className="w-5 h-5 animate-spin mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Codes de clôture
          </button>
  {/* Panel des codes de clôture d'appel */}
  <CallClosuresPanel open={showClosuresPanel} onClose={() => setShowClosuresPanel(false)} closures={callClosures} />
          <button
            onClick={handleOpenEmailModal}
            disabled={sendingEmail}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {sendingEmail ? "Envoi..." : "Envoyer le récap"}
          </button>
          <button
            onClick={handleOpenWeeklyReportModal}
            disabled={sendingWeeklyReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <BarChart3 className="w-4 h-4" />
            {sendingWeeklyReport ? "Envoi..." : "Rapport du mois en cours"}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h.008v.008H7.5V12zm4.5 0h.008v.008H12.0V12zm4.5 0h.008v.008H16.5V12zm-4.5 9a9 9 0 100-18 9 9 0 000 18zm2.25-6.75l-2.25-2.25-2.25 2.25" />
            </svg>
            Send Whatsapp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <SalesFilters
            selectedOffers={selectedOffers}
            setSelectedOffers={setSelectedOffers}
            selectedSellers={selectedSellers}
            setSelectedSellers={setSelectedSellers}
            selectedOrderStatus={selectedOrderStatus}
            setSelectedOrderStatus={setSelectedOrderStatus}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            offers={OFFERS}
            sellers={sellers}
            onClearFilters={handleClearFilters}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Ventes Canal+ ({filteredSales.length})
                </h3>
                <p className="text-sm text-gray-600">
                  {filteredSales.length} vente{filteredSales.length > 1 ? "s" : ""} Canal+ trouvée
                  {filteredSales.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <SalesTable
              sales={filteredSales}
              offers={OFFERS}
              onEdit={setEditingSale}
              onDelete={handleDeleteSale}
            />
          </div>
        </div>
      </div>

      <EditSaleModal
        sale={editingSale}
        offers={OFFERS}
        onSave={handleEditSale}
        onClose={() => setEditingSale(null)}
      />

      <EmailRecipientsModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendRecap}
        isLoading={sendingEmail}
      />

      <EmailRecipientsModal
        isOpen={showWeeklyReportModal}
        onClose={() => setShowWeeklyReportModal(false)}
        onSend={handleSendWeeklyReport}
        isLoading={sendingWeeklyReport}
      />

      <ContactsArguesModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contactsArgues={contactsArguesHistory}
        onSave={handleSaveHistoricalContactsArgues}
        isLoading={loadingContactsArgues}
      />
    </div>
  );
};

export default AdminSalesPage;
