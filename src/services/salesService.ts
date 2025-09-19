import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { getWeekDates } from "../utils/dateUtils";

export type OrderStatus =
  | "en_attente"
  | "valide"
  | "probleme_iban"
  | "roac"
  | "validation_soft"; // anciennement "validation_finale"

export interface Sale {
  id: string;
  date: any;
  offer: string;
  name: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  userId?: string; // Optionnel pour compatibilité avec les composants existants
  // Nouvelles données client (optionnelles)
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
}

export interface ContactsArgues {
  id?: string;
  date: string; // Format YYYY-MM-DD
  count: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface Offer {
  id: string;
  name: string;
}

export const OFFERS: Offer[] = [
  { id: "canal", name: "CANAL+" },
  { id: "canal-cine-series", name: "CANAL+ Ciné Séries" },
  { id: "canal-sport", name: "CANAL+ Sport" },
  { id: "canal-100", name: "CANAL+ 100%" },
];

export interface SalesFilters {
  offers?: string[];
  sellers?: string[];
  orderStatus?: OrderStatus[];
  startDate?: string;
  endDate?: string;
}

export interface SalesStats {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  totalSales: number;
}

// L'interface PeriodOptions a été supprimée car elle n'est plus utilisée

class SalesService {
  private salesCollection = collection(db, "sales");

  /**
   * Normalise un statut de commande vers une valeur attendue par l'appli
   */
  normalizeOrderStatus(value: any): OrderStatus {
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
    )
      return "probleme_iban";
  // Ancien statut "validation_finale" renommé en "validation_soft" (aussi pour "valid soft")
  if (normalized.includes("final") || normalized.includes("soft")) return "validation_soft";
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
  }

  /**
   * Parse une date depuis Firestore
   */
  parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    if (dateValue.toDate && typeof dateValue.toDate === "function") {
      return dateValue.toDate();
    }

    if (typeof dateValue === "string") {
      return new Date(dateValue);
    }

    if (dateValue instanceof Date) {
      return dateValue;
    }

    return null;
  }

  /**
   * Vérifie si une date est aujourd'hui
   */
  isToday(date: any): boolean {
    const d = this.parseDate(date);
    if (!d) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }

  /**
   * Vérifie si une date est dans la semaine courante
   */
  isThisWeek(date: any): boolean {
    const d = this.parseDate(date);
    if (!d) return false;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }

  /**
   * Vérifie si une date est dans la semaine courante ET dans le mois courant
   */
  isThisWeekInMonth(date: any): boolean {
    const d = this.parseDate(date);
    if (!d) return false;
    const now = new Date();
    
    // Vérifier si c'est dans le mois courant
    const isInCurrentMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (!isInCurrentMonth) return false;
    
    // Vérifier si c'est dans la semaine courante
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return d >= weekStart;
  }

  /**
   * Vérifie si une date est dans le mois courant
   */
  isThisMonth(date: any): boolean {
    const d = this.parseDate(date);
    if (!d) return false;
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }

  /**
   * Récupère toutes les ventes
   */
  async getAllSales(): Promise<Sale[]> {
    try {
      // Version d'origine : lecture simple de la collection "sales"
      const snapshot = await getDocs(collection(db, "sales"));
      const salesData = snapshot.docs.map((d) => {
        const data = d.data() as any;
        // Mapping direct du basketStatus si présent (même logique que page AdminSalesPage)
        const basket =
          data?.basketStatus ??
          data?.basket_status ??
          data?.statut_panier ??
          data?.panierStatut;

        const mapBasketStatus = (basketVal: any): OrderStatus | undefined => {
          if (basketVal == null || basketVal === "") return undefined;
          const raw = basketVal.toString().toUpperCase().trim();
          switch (raw) {
            case "OK":
              return "valide";
            case "VALID FINALE":
            case "VALIDATION FINALE":
            case "VALID SOFT":
            case "VALIDATION SOFT":
              return "validation_soft";
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
              return undefined;
          }
        };

        const candidateStatus =
          mapBasketStatus(basket) ??
          data?.orderStatus ??
          data?.status ??
          data?.order_status ??
          data?.statut ??
          data?.statut_commande ??
          data?.status_commande ??
          (data?.consent === "yes" || data?.consentement === "yes"
            ? "valide"
            : undefined);

        // Normalisation du nom vendeur pour unifier variantes (ex: Guy Laroche KOUADIO → Guy la roche)
        const rawName = data.name || data.seller || data.vendeur || "";
        let unifiedName = rawName;
        const lowerName = rawName.toLowerCase();
        if (lowerName.includes("guy") && lowerName.includes("laroche")) {
          unifiedName = "Guy la roche";
        }
        return {
          id: d.id,
          date: data.date || null,
          offer: data.offer || data.offerId || "",
          name: unifiedName,
          orderNumber: data.orderNumber || data.order || data.panier || "",
          orderStatus: this.normalizeOrderStatus(candidateStatus),
          userId: data.userId || data.updatedBy || null,
          clientFirstName: data.clientFirstName || data.client_first_name || "",
          clientLastName: data.clientLastName || data.client_last_name || "",
          clientPhone: data.clientPhone || data.client_phone || "",
          ...data,
        } as Sale;
      }) as Sale[];
      return salesData;
    } catch (error) {
      console.error("Erreur lors du chargement des ventes:", error);
      throw new Error("Impossible de charger les ventes");
    }
  }

  /**
   * Récupère les ventes avec filtres
   */
  async getSalesWithFilters(filters: SalesFilters): Promise<Sale[]> {
    try {
      // Pour l'instant, on récupère toutes les ventes et on filtre côté client
      // Dans une version future, on pourrait optimiser avec des requêtes Firestore
      const allSales = await this.getAllSales();
      return this.filterSales(allSales, filters);
    } catch (error) {
      console.error("Erreur lors du filtrage des ventes:", error);
      throw error;
    }
  }



  /**
   * Filtre les ventes selon les critères donnés
   */
  filterSales(sales: Sale[], filters: SalesFilters): Sale[] {
    let filtered = [...sales];

    // Filtre par offres
    if (filters.offers && filters.offers.length > 0) {
      filtered = filtered.filter((sale) =>
        filters.offers!.includes(sale.offer)
      );
    }

    // Filtre par vendeurs
    if (filters.sellers && filters.sellers.length > 0) {
      filtered = filtered.filter((sale) =>
        filters.sellers!.includes(sale.name)
      );
    }

    // Filtre par statut de commande
    if (filters.orderStatus && filters.orderStatus.length > 0) {
      filtered = filtered.filter((sale) =>
        filters.orderStatus!.includes(
          this.normalizeOrderStatus((sale as any).orderStatus)
        )
      );
    }

    // Filtre par dates
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((sale) => {
        const saleDate = this.parseDate(sale.date);
        if (!saleDate) return false;

        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;

        // Ajuster la date de fin pour inclure toute la journée (23:59:59)
        if (end) {
          end.setHours(23, 59, 59, 999);
        }

        if (start && saleDate < start) return false;
        if (end && saleDate > end) return false;

        return true;
      });
    }

    return filtered;
  }

  /**
   * Calcule les statistiques des ventes
   */
  getSalesStats(sales: Sale[]): SalesStats {
    return {
      dailySales: sales.filter((sale) => this.isToday(sale.date)).length,
      weeklySales: sales.filter((sale) => this.isThisWeekInMonth(sale.date)).length,
      monthlySales: sales.filter((sale) => this.isThisMonth(sale.date)).length,
      totalSales: sales.length,
    };
  }

  /**
   * Récupère la liste unique des vendeurs
   */
  getSellers(sales: Sale[]): string[] {
    return Array.from(new Set(sales.map((sale) => sale.name))).filter(Boolean);
  }

  /**
   * Récupère les ventes récentes (aujourd'hui)
   */
  getRecentSales(sales: Sale[], limit: number = 10): Sale[] {
    return sales
      .filter((sale) => this.isToday(sale.date))
      .sort((a, b) => {
        const dateA = this.parseDate(a.date);
        const dateB = this.parseDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Calcule le top des vendeurs
   */
  getTopSellers(
    sales: Sale[],
    limit: number = 5
  ): Array<{ name: string; count: number }> {
    const salesCount = sales.reduce((acc, sale) => {
      acc[sale.name] = (acc[sale.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(salesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Met à jour une vente
   */
  async updateSale(saleId: string, updatedData: Partial<Sale>): Promise<void> {
    try {
      const dataToSave = { ...updatedData } as any;
      if (dataToSave.orderStatus) {
        dataToSave.orderStatus = this.normalizeOrderStatus(
          dataToSave.orderStatus
        );
      }
      await updateDoc(doc(db, "sales", saleId), dataToSave);
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      throw new Error("Impossible de modifier la vente");
    }
  }

  /**
   * Supprime une vente
   */
  async deleteSale(saleId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "sales", saleId));
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      throw new Error("Impossible de supprimer la vente");
    }
  }

  /**
   * Met à jour en masse le statut des ventes pour une plage de dates.
   * Les dates sont des chaînes au format YYYY-MM-DD (inclusives).
   */
  async bulkUpdateOrderStatus(params: {
    startDate: string;
    endDate: string;
    fromStatuses?: OrderStatus[]; // si non fourni, met à jour tout
    toStatus: OrderStatus;
  }): Promise<{ updated: number }>
  {
    const { startDate, endDate, fromStatuses, toStatus } = params;

    const all = await this.getAllSales();

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const candidates = all.filter((s) => {
      const d = this.parseDate(s.date);
      if (!d) return false;
      const inRange = d >= start && d <= end;
      if (!inRange) return false;
      if (!fromStatuses || fromStatuses.length === 0) return true;
      return fromStatuses.includes(this.normalizeOrderStatus((s as any).orderStatus));
    });

    let updated = 0;
    // Batch writes par paquets (limite Firestore ~500)
    for (let i = 0; i < candidates.length; i += 400) {
      const batch = writeBatch(db);
      const slice = candidates.slice(i, i + 400);
      slice.forEach((s) => {
        const ref = doc(db, "sales", s.id);
        batch.update(ref, { orderStatus: toStatus });
      });
      await batch.commit();
      updated += slice.length;
    }

    return { updated };
  }

  /**
   * Retourne le nom d'une offre par son ID
   */
  getOfferName(offerId: string): string {
    const offer = OFFERS.find((o) => o.id === offerId);
    return offer?.name || offerId;
  }

  /**
   * Exporte les ventes au format CSV
   */
  exportToCSV(sales: Sale[]): string {
    const headers = [
      "Date",
      "Heure",
      "Vendeur",
      "N° Commande",
      "Offre",
      "Statut commande",
      "Client_Nom",
      "Client_Prenom",
      "Client_Telephone"
    ];
    // Fonction pour échapper les champs CSV (gère les points-virgules, guillemets, etc.)
    const escapeCSV = (value: string | undefined) => {
      if (value === undefined || value === null) return '';
      const str = String(value);
      // Si le champ contient un point-virgule, un guillemet ou un retour à la ligne, on l'entoure de guillemets et on double les guillemets internes
      if (/[;"\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(";"),
      ...sales.map((sale) => {
        const saleDate = this.parseDate(sale.date);
        const offerName = this.getOfferName(sale.offer);
        const heure = saleDate ? saleDate.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "";
        // Mapping for display
        const statusLabels: Record<OrderStatus, string> = {
          en_attente: "En attente",
          valide: "Validé",
          probleme_iban: "Problème IBAN",
          roac: "ROAC",
          validation_soft: "Valid Soft"
        };
        return [
          saleDate ? saleDate.toLocaleDateString("fr-FR") : "",
          heure,
          sale.name,
          sale.orderNumber,
          offerName,
          statusLabels[sale.orderStatus] || sale.orderStatus,
          sale.clientLastName || "",
          sale.clientFirstName || "",
          sale.clientPhone || "",
        ].map(escapeCSV).join(";");
      }),
    ].join("\r\n"); // Utilise CRLF pour compatibilité Excel
    return csvContent;
  }

  /**
   * Récupère toutes les ventes avec un certain statut (pour le dashboard)
   */
  async getSalesWithStatus(status: OrderStatus): Promise<Sale[]> {
    try {
      const allSales = await this.getAllSales();
      return allSales.filter((sale) => sale.orderStatus === status);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des ventes avec statut:",
        error
      );
      throw error;
    }
  }

  /**
   * Génère une liste de périodes complètes selon le type demandé
   */
  getCompletePeriods(
    sales: Sale[],
    periodType: "day" | "week" | "month",
    numberOfPeriods: number = 7
  ): string[] {
    if (sales.length === 0) return [];

    const today = new Date();
    const periods: string[] = [];

    switch (periodType) {
      case "day":
        for (let i = numberOfPeriods - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          periods.push(
            date.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            })
          );
        }
        break;

      case "week":
        for (let i = numberOfPeriods - 1; i >= 0; i--) {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - (today.getDay() + i * 7));
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          periods.push(
            `${weekStart.getDate()}/${
              weekStart.getMonth() + 1
            } - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`
          );
        }
        break;

      case "month":
        for (let i = numberOfPeriods - 1; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          periods.push(
            date.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })
          );
        }
        break;
    }

    return periods;
  }

  /**
   * Compte les ventes pour chaque période complète
   */
  getSalesCountByCompletePeriods(
    sales: Sale[],
    periodType: "day" | "week" | "month",
    numberOfPeriods: number = 7
  ): number[] {
    const today = new Date();
    const counts: number[] = [];

    switch (periodType) {
      case "day":
        for (let i = numberOfPeriods - 1; i >= 0; i--) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() - i);

          const count = sales.filter((sale) => {
            const saleDate = this.parseDate(sale.date);
            if (!saleDate) return false;

            return (
              saleDate.getDate() === targetDate.getDate() &&
              saleDate.getMonth() === targetDate.getMonth() &&
              saleDate.getFullYear() === targetDate.getFullYear()
            );
          }).length;

          counts.push(count);
        }
        break;

      case "week":
        for (let i = numberOfPeriods - 1; i >= 0; i--) {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - (today.getDay() + i * 7));
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          const count = sales.filter((sale) => {
            const saleDate = this.parseDate(sale.date);
            if (!saleDate) return false;

            return saleDate >= weekStart && saleDate <= weekEnd;
          }).length;

          counts.push(count);
        }
        break;

      case "month":
        for (let i = numberOfPeriods - 1; i >= 0; i--) {
          // Premier jour du mois
          const monthStart = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
          );
          monthStart.setHours(0, 0, 0, 0);

          // Dernier jour du mois
          const monthEnd = new Date(
            today.getFullYear(),
            today.getMonth() - i + 1,
            0
          );
          monthEnd.setHours(23, 59, 59, 999);

          const count = sales.filter((sale) => {
            const saleDate = this.parseDate(sale.date);
            if (!saleDate) return false;

            return saleDate >= monthStart && saleDate <= monthEnd;
          }).length;

          counts.push(count);
        }
        break;
    }

    return counts;
  }

  // Les fonctions getCompletePeriodsFromFixedDate et getSalesCountByCompletePeriodsFromFixedDate
  // ont été supprimées car elles ne sont plus utilisées avec la nouvelle approche de sélection de période simplifiée

  // Les fonctions getCustomPeriods et getCustomSalesCountByPeriods ont été supprimées
  // car elles ne sont plus utilisées avec la nouvelle approche de sélection de période simplifiée

  /**
   * Récupère les contacts argumentés pour une date spécifique
   * @param dateStr Date au format YYYY-MM-DD
   * @returns Le nombre de contacts argumentés pour cette date
   */
  async getContactsArguesForDate(dateStr: string): Promise<number> {
    try {
      const contactsArguesRef = collection(db, "contactsArgues");
      const q = query(contactsArguesRef, where("date", "==", dateStr));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return 0;

      return snapshot.docs[0].data().count || 0;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des contacts argumentés:",
        error
      );
      return 0;
    }
  }

  /**
   * Récupère les contacts argumentés pour une période
   * @param startDate Date de début au format YYYY-MM-DD
   * @param endDate Date de fin au format YYYY-MM-DD
   * @returns Tableau des contacts argumentés pour la période
   */
  async getContactsArguesForPeriod(
    startDate?: string,
    endDate?: string
  ): Promise<ContactsArgues[]> {
    try {
      const contactsArguesRef = collection(db, "contactsArgues");
      let q = query(contactsArguesRef, orderBy("date", "desc"));

      if (startDate) {
        q = query(q, where("date", ">=", startDate));
      }

      if (endDate) {
        q = query(q, where("date", "<=", endDate));
      }

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ContactsArgues[];
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des contacts argumentés:",
        error
      );
      return [];
    }
  }

  /**
   * Récupère les 30 derniers contacts argumentés
   * @returns Tableau des 30 derniers contacts argumentés
   */
  async getRecentContactsArgues(): Promise<ContactsArgues[]> {
    try {
      const contactsArguesRef = collection(db, "contactsArgues");
      const q = query(contactsArguesRef, orderBy("date", "desc"), limit(30));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ContactsArgues[];
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des contacts argumentés récents:",
        error
      );
      return [];
    }
  }

  /**
   * Enregistre ou met à jour les contacts argumentés pour une date donnée
   * @param date Date au format YYYY-MM-DD
   * @param count Nombre de contacts argumentés
   * @param userId ID de l'utilisateur qui effectue la modification
   * @returns ID du document mis à jour ou créé
   */
  async saveContactsArgues(
    date: string,
    count: number,
    userId?: string
  ): Promise<string> {
    try {
      const contactsArguesRef = collection(db, "contactsArgues");
      const q = query(contactsArguesRef, where("date", "==", date));
      const snapshot = await getDocs(q);

      const data: ContactsArgues = {
        date,
        count,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      let docId;

      if (snapshot.empty) {
        // Créer un nouveau document
        const docRef = await addDoc(contactsArguesRef, data);
        docId = docRef.id;
      } else {
        // Mettre à jour le document existant
        const docRef = doc(db, "contactsArgues", snapshot.docs[0].id);
        await updateDoc(docRef, {
          count: count,
          updatedAt: Timestamp.now(),
          updatedBy: userId || null,
        });
        docId = snapshot.docs[0].id;
      }

      return docId;
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement des contacts argumentés:",
        error
      );
      throw new Error("Impossible d'enregistrer les contacts argumentés");
    }
  }

  /**
   * Calcule le total des contacts argumentés pour une période donnée
   * @param contacts Liste des contacts argumentés
   * @returns Le nombre total de contacts argumentés
   */
  calculateTotalContactsArgues(contacts: ContactsArgues[]): number {
    return contacts.reduce((total, contact) => total + contact.count, 0);
  }

  /**
   * Fonction pour compter les ventes d'une période spécifique (mois, semaine ou jour)
   * Pour les objectifs hebdomadaires, peut filtrer par mois si monthFilter est spécifié
   */
  async getSalesCountForPeriod(
    period: "month" | "week" | "day",
    periodData: {
      year?: number;
      month?: number;
      weekYear?: number;
      weekNumber?: number;
      dayYear?: number;
      dayMonth?: number;
      dayDate?: number;
      monthFilter?: number; // Nouveau paramètre pour filtrer les semaines par mois
      userId?: string; // Ajout pour filtrer par utilisateur
    }
  ): Promise<number> {
    try {
      let startDate: Date, endDate: Date;

      if (period === "month" && periodData.year && periodData.month) {
        startDate = new Date(periodData.year, periodData.month - 1, 1);
        endDate = new Date(periodData.year, periodData.month, 0);
      } else if (
        period === "week" &&
        periodData.weekYear &&
        periodData.weekNumber
      ) {
        const weekDates = getWeekDates(periodData.weekYear, periodData.weekNumber);
        startDate = weekDates.startDate;
        endDate = weekDates.endDate;
        if (periodData.monthFilter) {
          const monthStart = new Date(periodData.weekYear, periodData.monthFilter - 1, 1);
          const monthEnd = new Date(periodData.weekYear, periodData.monthFilter, 0);
          if (startDate < monthStart) startDate = monthStart;
          if (endDate > monthEnd) endDate = monthEnd;
        }
      } else if (
        period === "day" &&
        periodData.dayYear &&
        periodData.dayMonth &&
        periodData.dayDate
      ) {
        startDate = new Date(periodData.dayYear, periodData.dayMonth - 1, periodData.dayDate);
        endDate = new Date(periodData.dayYear, periodData.dayMonth - 1, periodData.dayDate);
      } else {
        return 0;
      }

      const firestoreStartDate = Timestamp.fromDate(startDate);
      const firestoreEndDate = Timestamp.fromDate(new Date(endDate.setHours(23, 59, 59, 999)));
      // Requête Firestore : filtrage uniquement par date
      const q = query(
        this.salesCollection,
        where("date", ">=", firestoreStartDate),
        where("date", "<=", firestoreEndDate)
      );

      const snapshot = await getDocs(q);
      let countWithStatus = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Filtrage JS par userId si présent
        if (
          data.orderStatus === "valide" &&
          (!periodData.userId || data.userId === periodData.userId)
        ) {
          countWithStatus++;
        }
      });
  return countWithStatus;
    } catch (error) {
      console.error("Erreur lors du comptage des ventes pour la période:", error);
      return 0;
    }
}

// Export d'une instance singleton
}

// Export d'une instance singleton
export const salesService = new SalesService();
export default salesService;
