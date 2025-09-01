import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getWeekDates, getWeekNumber } from "../utils/dateUtils";

export interface Objective {
  id?: string;
  missionId?: string | null; // Peut être null pour les objectifs globaux
  type: "sales" | "contactsArgues" | "other";
  label: string;
  target: number; // L'objectif (remplace monthlyTarget et weeklyTarget)
  period: "month" | "week" | "day"; // Soit mois, soit semaine, soit jour

  // Pour les objectifs mensuels
  year?: number; // 2025
  month?: number; // 1-12 pour janvier-décembre

  // Pour les objectifs hebdomadaires (simplifié)
  weekYear?: number; // Année de la semaine
  weekNumber?: number; // Numéro de semaine dans l'année (1-53)

  // Pour les objectifs journaliers (nouveau)
  dayYear?: number; // Année du jour
  dayMonth?: number; // Mois du jour (1-12)
  dayDate?: number; // Jour du mois (1-31)

  // Nouveaux champs pour les objectifs personnels
  scope: "team" | "personal"; // Objectif d'équipe ou personnel
  userId?: string; // ID de l'utilisateur pour les objectifs personnels
  assignedTo?: string; // ID de l'utilisateur assigné (pour les objectifs personnels)
  assignedToName?: string; // Nom de l'utilisateur assigné (pour l'affichage)

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

class ObjectiveService {
  private objectivesCollection = collection(db, "objectives");

  async getObjectives(): Promise<Objective[]> {
    try {
      const q = query(this.objectivesCollection, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Objective[];
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs:", error);
      throw error;
    }
  }

  async getObjectivesByMission(missionId: string): Promise<Objective[]> {
    try {
      const q = query(
        this.objectivesCollection,
        where("missionId", "==", missionId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Objective[];
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des objectifs de la mission:",
        error
      );
      throw error;
    }
  }

  async getGlobalObjectives(): Promise<Objective[]> {
    try {
      // Récupérer tous les objectifs puisque nous n'utilisons plus de filtrage par mission
      const q = query(this.objectivesCollection, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Objective[];
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs:", error);
      throw error;
    }
  }

  async getTeamObjectives(): Promise<Objective[]> {
    try {
      // Récupère tous les objectifs d'équipe sans orderBy pour éviter l'index
      const q = query(this.objectivesCollection, where("scope", "==", "team"));
      const snapshot = await getDocs(q);
      const mapped = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Objective) }));
      console.log("[ObjectiveService] Team objectives raw:", mapped);
      // Tri côté client avec typage explicite
      return mapped.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs d'équipe:", error);
      throw error;
    }
  }

  async getPersonalObjectives(userId: string): Promise<Objective[]> {
    try {
      // Récupère tous les objectifs personnels sans orderBy pour éviter l'index
      const q = query(this.objectivesCollection, where("scope", "==", "personal"));
      const snapshot = await getDocs(q);
      const mapped = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Objective) }));
      console.log("[ObjectiveService] Personal objectives raw:", mapped);
      // TEMP: Return all personal objectives for debugging
      return mapped.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs personnels:", error);
      throw error;
    }
  }

  async getAllObjectivesForUser(
    userId: string
  ): Promise<{ team: Objective[]; personal: Objective[] }> {
    try {
      const [teamObjectives, personalObjectives] = await Promise.all([
        this.getTeamObjectives(),
        this.getPersonalObjectives(userId),
      ]);

      return {
        team: teamObjectives,
        personal: personalObjectives,
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des objectifs pour l'utilisateur:",
        error
      );
      throw error;
    }
  }

  async createObjective(
    objective: Omit<Objective, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const objectiveData = {
        ...objective,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(this.objectivesCollection, objectiveData);
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création de l'objectif:", error);
      throw error;
    }
  }

  async updateObjective(
    id: string,
    updates: Partial<Objective>
  ): Promise<void> {
    try {
      const objectiveRef = doc(this.objectivesCollection, id);
      await updateDoc(objectiveRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'objectif:", error);
      throw error;
    }
  }

  async deleteObjective(id: string): Promise<void> {
    try {
      const objectiveRef = doc(this.objectivesCollection, id);
      await deleteDoc(objectiveRef);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'objectif:", error);
      throw error;
    }
  }

  async createDefaultObjectives(): Promise<void> {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 0-based month + 1

      // Créer les objectifs par défaut (globaux) pour le mois actuel
      const defaultObjectives = [
        {
          type: "sales" as const,
          label: "Ventes",
          target: 100,
          period: "month" as const,
          year: currentYear,
          month: currentMonth,
          scope: "team" as const,
          isActive: true,
          createdBy: "system",
          missionId: null,
        },
        {
          type: "contactsArgues" as const,
          label: "Contacts argumentés",
          target: 200,
          period: "month" as const,
          year: currentYear,
          month: currentMonth,
          scope: "team" as const,
          isActive: true,
          createdBy: "system",
          missionId: null,
        },
      ];

      for (const objective of defaultObjectives) {
        await this.createObjective(objective);
      }

      console.log("Objectifs par défaut créés avec succès");
    } catch (error) {
      console.error(
        "Erreur lors de la création des objectifs par défaut:",
        error
      );
    }
  }

  validateObjective(objective: Partial<Objective>): string[] {
    const errors: string[] = [];

    if (!objective.label || objective.label.trim().length < 2) {
      errors.push("Le nom de l'objectif doit contenir au moins 2 caractères");
    }

    if (
      !objective.type ||
      !["sales", "contactsArgues", "other"].includes(objective.type)
    ) {
      errors.push(
        "Le type d'objectif doit être 'sales', 'contactsArgues' ou 'other'"
      );
    }

    if (
      !objective.period ||
      !["month", "week", "day"].includes(objective.period)
    ) {
      errors.push("La période doit être 'month', 'week' ou 'day'");
    }

    if (objective.target !== undefined && objective.target <= 0) {
      errors.push("L'objectif doit être positif");
    }

    // Validation spécifique pour les objectifs mensuels
    if (objective.period === "month") {
      if (!objective.year || objective.year < 2020 || objective.year > 2030) {
        errors.push("L'année doit être entre 2020 et 2030");
      }
      if (!objective.month || objective.month < 1 || objective.month > 12) {
        errors.push("Le mois doit être entre 1 et 12");
      }
    }

    // Validation spécifique pour les objectifs hebdomadaires
    if (objective.period === "week") {
      if (
        !objective.weekYear ||
        objective.weekYear < 2020 ||
        objective.weekYear > 2030
      ) {
        errors.push("L'année de la semaine doit être entre 2020 et 2030");
      }
      if (
        !objective.weekNumber ||
        objective.weekNumber < 1 ||
        objective.weekNumber > 53
      ) {
        errors.push("Le numéro de semaine doit être entre 1 et 53");
      }
    }

    // Validation spécifique pour les objectifs journaliers
    if (objective.period === "day") {
      if (
        !objective.dayYear ||
        objective.dayYear < 2020 ||
        objective.dayYear > 2030
      ) {
        errors.push("L'année du jour doit être entre 2020 et 2030");
      }
      if (
        !objective.dayMonth ||
        objective.dayMonth < 1 ||
        objective.dayMonth > 12
      ) {
        errors.push("Le mois du jour doit être entre 1 et 12");
      }
      if (
        !objective.dayDate ||
        objective.dayDate < 1 ||
        objective.dayDate > 31
      ) {
        errors.push("Le jour doit être entre 1 et 31");
      }
    }

    return errors;
  }

  async checkObjectiveExists(objective: Partial<Objective>): Promise<boolean> {
    try {
      // Construire la requête en fonction du type d'objectif et du scope
      let filters = [];
      if (objective.period === "month") {
        filters = [
          where("period", "==", "month"),
          where("type", "==", objective.type),
          where("year", "==", objective.year),
          where("month", "==", objective.month)
        ];
      } else if (objective.period === "week") {
        filters = [
          where("period", "==", "week"),
          where("type", "==", objective.type),
          where("weekYear", "==", objective.weekYear),
          where("weekNumber", "==", objective.weekNumber)
        ];
      } else if (objective.period === "day") {
        filters = [
          where("period", "==", "day"),
          where("type", "==", objective.type),
          where("dayYear", "==", objective.dayYear),
          where("dayMonth", "==", objective.dayMonth),
          where("dayDate", "==", objective.dayDate)
        ];
      } else {
        return false;
      }

      // Ajout du filtre sur le scope et l'utilisateur
      if (objective.scope === "personal") {
        filters.push(where("scope", "==", "personal"));
        // Filtre sur l'utilisateur assigné ou userId
        if (objective.assignedTo) {
          filters.push(where("assignedTo", "==", objective.assignedTo));
        } else if (objective.userId) {
          filters.push(where("userId", "==", objective.userId));
        }
      } else if (objective.scope === "team") {
        filters.push(where("scope", "==", "team"));
      }

      const q = query(this.objectivesCollection, ...filters);
      const snapshot = await getDocs(q);

      // Si on est en mode édition, ignorer l'objectif en cours d'édition
      if (objective.id) {
        return snapshot.docs.some((doc) => doc.id !== objective.id);
      }

      // Sinon, vérifier s'il y a des résultats
      return !snapshot.empty;
    } catch (error) {
      console.error(
        "Erreur lors de la vérification d'existence d'un objectif:",
        error
      );
      return false;
    }
  }

  // Fonctions utilitaires pour les dates
  getWeekNumber(date: Date): { year: number; week: number } {
    return getWeekNumber(date);
  }

  // Fonction pour calculer les dates de début et fin d'une semaine donnée
  getWeekDates(
    weekYear: number,
    weekNumber: number
  ): { startDate: Date; endDate: Date } {
    return getWeekDates(weekYear, weekNumber);
  }

  getWeeksInMonth(
    year: number,
    month: number
  ): Array<{ weekNumber: number; weekYear: number }> {
    const weeks: Array<{ weekNumber: number; weekYear: number }> = [];
    const lastDay = new Date(year, month, 0);

    // Parcourir tous les jours du mois et trouver les semaines uniques
    const seenWeeks = new Set<string>();

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month - 1, day);
      const weekInfo = this.getWeekNumber(currentDate);
      const weekKey = `${weekInfo.year}-${weekInfo.week}`;

      if (!seenWeeks.has(weekKey)) {
        seenWeeks.add(weekKey);
        weeks.push({
          weekNumber: weekInfo.week,
          weekYear: weekInfo.year,
        });
      }
    }

    return weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  }

  getMonthName(month: number): string {
    const months = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    return months[month - 1] || "";
  }

  formatObjectivePeriod(objective: Objective): string {
    if (objective.period === "month") {
      return `${this.getMonthName(objective.month!)} ${objective.year}`;
    } else if (objective.period === "week") {
      return `Semaine ${objective.weekNumber} (${objective.weekYear})`;
    } else if (objective.period === "day") {
      return `${objective.dayDate} ${this.getMonthName(objective.dayMonth!)} ${
        objective.dayYear
      }`;
    }
    return "";
  }

  // Calcul du pourcentage de progression
  calculateProgressPercentage(
    objective: Objective,
    currentCount: number
  ): number {
    if (!objective.target || objective.target <= 0) return 0;
    const percentage = (currentCount / objective.target) * 100;
    return Math.min(Math.round(percentage * 10) / 10, 100); // Arrondi à un décimal, max 100%
  }

  // Calcul du nombre de jours travaillés restants (lundi à vendredi uniquement)
  calculateRemainingDays(objective: Objective): number {
    const today = new Date();
    let endDate: Date;

    if (objective.period === "month") {
      // Pour les objectifs mensuels, calculer le dernier jour du mois
      if (!objective.year || !objective.month) return 0;
      endDate = new Date(objective.year, objective.month, 0); // Dernier jour du mois
    } else if (objective.period === "week") {
      // Pour les objectifs hebdomadaires, utiliser la nouvelle méthode unifiée
      if (!objective.weekYear || !objective.weekNumber) return 0;

      const weekDates = this.getWeekDates(
        objective.weekYear,
        objective.weekNumber
      );
      endDate = weekDates.endDate;
    } else if (objective.period === "day") {
      // Pour les objectifs journaliers, la date de fin est le jour même
      if (!objective.dayYear || !objective.dayMonth || !objective.dayDate)
        return 0;
      endDate = new Date(
        objective.dayYear,
        objective.dayMonth - 1,
        objective.dayDate
      );
    } else {
      return 0;
    }

    // Si la date de fin est déjà passée, retourner 0
    if (endDate < today) return 0;

    // Calculer uniquement les jours travaillés (lundi à vendredi)
    return this.countWorkingDays(today, endDate);
  }

  // Fonction utilitaire pour compter les jours travaillés entre deux dates
  private countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);

    // Commencer au jour suivant pour ne pas compter aujourd'hui
    currentDate.setDate(currentDate.getDate() + 1);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // 1 = lundi, 2 = mardi, ..., 5 = vendredi (0 = dimanche, 6 = samedi)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }
}

export default new ObjectiveService();
