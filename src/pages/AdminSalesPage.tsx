import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";
import salesService, {
  Sale,
  OFFERS,
  ContactsArgues,
} from "../services/salesService";
import SalesFilters from "../components/admin/SalesFilters";
import SalesTable from "../components/admin/SalesTable";
import EditSaleModal from "../components/admin/EditSaleModal";
import EmailRecipientsModal from "../components/admin/EmailRecipientsModal";
import ContactsArguesModal from "../components/admin/ContactsArguesModal";
import { Mail, Download, Calendar, Save, BarChart3 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

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

  // Filtres
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [selectedConsent, setSelectedConsent] = useState<string[]>(["yes"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Contacts argumentés
  const [contactsArgues, setContactsArgues] = useState<string>("0");
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [contactsArguesHistory, setContactsArguesHistory] = useState<
    ContactsArgues[]
  >([]);
  const [loadingContactsArgues, setLoadingContactsArgues] = useState(true);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [savingContactsArgues, setSavingContactsArgues] = useState(false);
  const [periodContactsArgues, setPeriodContactsArgues] = useState<number>(0); // Total des CA pour la période filtrée

  // Mise à jour en temps réel des ventes
  useEffect(() => {
    const setupRealtimeListener = () => {
      try {
        setLoading(true);
        setError("");

        // Créer une requête pour écouter les changements dans la collection "sales"
        const salesQuery = query(
          collection(db, "sales"),
          orderBy("date", "desc")
        );

        // Écouter les changements en temps réel
        const unsubscribe = onSnapshot(
          salesQuery,
          (snapshot) => {
            const salesData: Sale[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              salesData.push({
                id: doc.id,
                ...data,
              } as Sale);
            });

            setSales(salesData);
            setLoading(false);
          },
          (error) => {
            console.error("Erreur lors de l'écoute des ventes:", error);
            setError(error.message || "Erreur lors du chargement des ventes");
            setLoading(false);
          }
        );

        // Retourner la fonction de nettoyage
        return unsubscribe;
      } catch (err: any) {
        console.error("Erreur lors de la configuration de l'écoute:", err);
        setError(err.message || "Erreur lors de la configuration de l'écoute");
        setLoading(false);
      }
    };

    const unsubscribe = setupRealtimeListener();

    // Nettoyage lors du démontage du composant
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Charger les contacts argumentés
  useEffect(() => {
    const fetchContactsArgues = async () => {
      try {
        setLoadingContactsArgues(true);

        // Charger les contacts argumentés pour aujourd'hui
        const today = new Date().toISOString().split("T")[0];
        const todayContacts = await salesService.getContactsArguesForDate(
          today
        );
        setContactsArgues(todayContacts.toString());

        // Charger l'historique des contacts argumentés
        const recentContacts = await salesService.getRecentContactsArgues();
        setContactsArguesHistory(recentContacts);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des contacts argumentés:",
          error
        );
      } finally {
        setLoadingContactsArgues(false);
      }
    };

    fetchContactsArgues();
  }, []);

  // Filtrage des ventes via le service
  useEffect(() => {
    const filters = {
      offers: selectedOffers.length > 0 ? selectedOffers : undefined,
      sellers: selectedSellers.length > 0 ? selectedSellers : undefined,
      consent: selectedConsent.length > 0 ? selectedConsent : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const filtered = salesService.filterSales(sales, filters);
    setFilteredSales(filtered);
  }, [
    sales,
    selectedOffers,
    selectedSellers,
    selectedConsent,
    startDate,
    endDate,
  ]);

  // Calculer les contacts argumentés pour la période sélectionnée
  useEffect(() => {
    const calculatePeriodContactsArgues = async () => {
      try {
        // Si on n'a pas d'historique de CA, ne rien faire
        if (contactsArguesHistory.length === 0) return;

        // Date du jour au format YYYY-MM-DD
        const today = new Date().toISOString().split("T")[0];
        let filteredContacts: ContactsArgues[] = [];

        if (startDate && endDate) {
          // Période spécifique : du startDate au endDate
          filteredContacts = contactsArguesHistory.filter(
            (ca) => ca.date >= startDate && ca.date <= endDate
          );
        } else if (startDate && !endDate) {
          // Du startDate à aujourd'hui
          filteredContacts = contactsArguesHistory.filter(
            (ca) => ca.date >= startDate && ca.date <= today
          );
        } else if (!startDate && endDate) {
          // Jusqu'à la date de fin
          filteredContacts = contactsArguesHistory.filter(
            (ca) => ca.date <= endDate
          );
        } else {
          // Pas de filtre de date, on prend tout l'historique
          filteredContacts = [...contactsArguesHistory];
        }

        // Si les dates sélectionnées ne contiennent pas de CA dans notre historique,
        // chargeons les données directement depuis Firestore
        if (filteredContacts.length === 0 && (startDate || endDate)) {
          const caData = await salesService.getContactsArguesForPeriod(
            startDate,
            endDate
          );
          filteredContacts = caData;
        }

        // Calculer la somme des CA pour la période
        const total = filteredContacts.reduce((sum, ca) => sum + ca.count, 0);
        setPeriodContactsArgues(total);
      } catch (error) {
        console.error(
          "Erreur lors du calcul des contacts argumentés pour la période:",
          error
        );
      }
    };

    calculatePeriodContactsArgues();
  }, [contactsArguesHistory, startDate, endDate]);

  const sellers = salesService.getSellers(sales);

  const handleClearFilters = () => {
    setSelectedOffers([]);
    setSelectedSellers([]);
    setSelectedConsent(["yes"]);
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

  const handleSendRecap = async (recipients: string[]) => {
    try {
      setSendingEmail(true);

      const functions = getFunctions(app, "europe-west9");
      const sendSalesRecap = httpsCallable(functions, "sendSalesRecap");

      // Préparer la période
      let period = "";
      if (startDate && endDate) {
        if (startDate === endDate) {
          period = `Le ${new Date(startDate).toLocaleDateString("fr-FR")}`;
        } else {
          period = `Du ${new Date(startDate).toLocaleDateString(
            "fr-FR"
          )} au ${new Date(endDate).toLocaleDateString("fr-FR")}`;
        }
      } else if (startDate) {
        period = `À partir du ${new Date(startDate).toLocaleDateString(
          "fr-FR"
        )}`;
      } else if (endDate) {
        period = `Jusqu'au ${new Date(endDate).toLocaleDateString("fr-FR")}`;
      } else {
        period = "Toutes les ventes";
      }

      // Utiliser le nombre de contacts argumentés de la période sélectionnée
      const caForPeriod = periodContactsNumber.toString();

      const result = await sendSalesRecap({
        salesData: filteredSales,
        contactsArgues: caForPeriod,
        period: period,
        recipients: recipients,
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
      alert(
        "❌ Erreur: " +
          (error.message || "Erreur lors de l'envoi du récapitulatif")
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWeeklyReport = async (recipients: string[]) => {
    try {
      setSendingWeeklyReport(true);

      const functions = getFunctions(app, "europe-west9");
      const sendWeeklyReport = httpsCallable(functions, "sendWeeklyReport");

      // Calculer le début et la fin du mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Filtrer les ventes du mois en cours avec consentement "oui" uniquement
      const monthSales = sales.filter((sale) => {
        const saleDate = salesService.parseDate(sale.date);
        if (!saleDate || sale.consent !== "yes") {
          return false;
        }

        // Vérifier que la date est bien dans le mois en cours
        const saleMonth = saleDate.getMonth();
        const saleYear = saleDate.getFullYear();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return saleMonth === currentMonth && saleYear === currentYear;
      });

      // Récupérer les contacts argumentés du mois en cours
      const monthContactsArgues = await salesService.getContactsArguesForPeriod(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );

      // Filtrer les contacts argumentés pour s'assurer qu'ils sont du mois en cours
      const filteredContactsArgues = monthContactsArgues.filter((ca) => {
        const caDate = new Date(ca.date);
        const caMonth = caDate.getMonth();
        const caYear = caDate.getFullYear();
        return caMonth === now.getMonth() && caYear === now.getFullYear();
      });

      const result = await sendWeeklyReport({
        salesData: monthSales,
        contactsArguesData: filteredContactsArgues,
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
        recipients: recipients,
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
      alert(
        "❌ Erreur: " +
          (error.message || "Erreur lors de l'envoi du rapport hebdomadaire")
      );
    } finally {
      setSendingWeeklyReport(false);
    }
  };

  const handleOpenEmailModal = () => {
    setShowEmailModal(true);
  };

  const handleOpenWeeklyReportModal = () => {
    setShowWeeklyReportModal(true);
  };

  const handleExportCSV = () => {
    const csvContent = salesService.exportToCSV(filteredSales);
    salesService.downloadCSV(csvContent);
  };

  // Bouton WhatsApp
  const handleSendWhatsApp = () => {
    // Numéro au format international sans + ni espaces (France : 33)
    const numero = "33641039226";
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
    if (contactsArgues === "") {
      setContactsArgues("0");
    }
  };

  const handleContactsFocus = () => {
    setIsEditingContacts(true);
  };

  // Méthode pour sauvegarder les contacts argumentés d'aujourd'hui
  const handleSaveContactsArgues = async () => {
    try {
      setSavingContactsArgues(true);

      // Date d'aujourd'hui au format YYYY-MM-DD
      const today = new Date().toISOString().split("T")[0];
      const count = parseInt(contactsArgues) || 0;

      // Sauvegarder dans Firestore
      await salesService.saveContactsArgues(today, count, user?.id);

      // Mettre à jour l'historique
      const updatedHistory = await salesService.getRecentContactsArgues();
      setContactsArguesHistory(updatedHistory);
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement des contacts argumentés:",
        error
      );
      alert("Erreur lors de l'enregistrement des contacts argumentés");
    } finally {
      setSavingContactsArgues(false);
    }
  };

  // Méthode pour sauvegarder les contacts argumentés d'une date spécifique depuis le modal
  const handleSaveHistoricalContactsArgues = async (
    date: string,
    count: number
  ) => {
    try {
      await salesService.saveContactsArgues(date, count, user?.id);

      // Mettre à jour l'historique
      const updatedHistory = await salesService.getRecentContactsArgues();
      setContactsArguesHistory(updatedHistory);

      // Si c'est aujourd'hui, mettre également à jour le champ principal
      const today = new Date().toISOString().split("T")[0];
      if (date === today) {
        setContactsArgues(count.toString());
      }

      return Promise.resolve();
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement des contacts argumentés:",
        error
      );
      return Promise.reject(error);
    }
  };

  // Calculs des statistiques
  const periodContactsNumber = periodContactsArgues || 0;
  const conversionRate =
    periodContactsNumber > 0
      ? ((filteredSales.length / periodContactsNumber) * 100).toFixed(1)
      : "0";

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
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des ventes
          </h1>
          {/* Badge Canal+ */}
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
        {/* Première ligne : Ventes listées */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-cactus-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Ventes Canal+ listées
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSales.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deuxième ligne : Contacts argumentés et Taux de concrétisation */}
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
                      style={{
                        width: `${Math.max(contactsArgues.length * 20, 60)}px`,
                      }}
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
                    {isEditingContacts
                      ? "Tapez un nombre puis enregistrez"
                      : "Cliquez pour modifier"}
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
                <p className="text-sm font-medium text-gray-600">
                  Taux de concrétisation
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {conversionRate}%
                </p>
                <p className="text-xs text-gray-500">
                  {filteredSales.length} ventes / {periodContactsNumber}{" "}
                  contacts argumentés{" "}
                  {startDate || endDate ? "sur la période" : "au total"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* En-tête avec contacts argumentés et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"></div>
        </div>

        <div className="flex items-center gap-2">
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
        {/* Filtres */}
        <div className="lg:col-span-1">
          <SalesFilters
            selectedOffers={selectedOffers}
            setSelectedOffers={setSelectedOffers}
            selectedSellers={selectedSellers}
            setSelectedSellers={setSelectedSellers}
            selectedConsent={selectedConsent}
            setSelectedConsent={setSelectedConsent}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            offers={OFFERS}
            sellers={sellers}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Tableau des ventes */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Ventes Canal+ ({filteredSales.length})
                </h3>
                <p className="text-sm text-gray-600">
                  {filteredSales.length} vente
                  {filteredSales.length > 1 ? "s" : ""} Canal+ trouvée
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

      {/* Modal d'édition */}
      <EditSaleModal
        sale={editingSale}
        offers={OFFERS}
        onSave={handleEditSale}
        onClose={() => setEditingSale(null)}
      />

      {/* Modal de sélection des destinataires */}
      <EmailRecipientsModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendRecap}
        isLoading={sendingEmail}
      />

      {/* Modal de sélection des destinataires pour le rapport hebdomadaire */}
      <EmailRecipientsModal
        isOpen={showWeeklyReportModal}
        onClose={() => setShowWeeklyReportModal(false)}
        onSend={handleSendWeeklyReport}
        isLoading={sendingWeeklyReport}
      />

      {/* Modal de gestion des contacts argumentés */}
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
