import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import missionService, { Mission, MissionUser } from "./missionService";
import userService from "./userService";

class InitializationService {
  /**
   * Initialise la mission Canal+ si elle n'existe pas déjà
   */
  async initializeCanalPlusMission(): Promise<string> {
    try {
      console.log("Initialisation de la mission Canal+...");

      // Vérifier si la mission Canal+ existe déjà
      const missions = await missionService.getMissions();
      const existingCanalPlus = missions.find(
        (m) =>
          m.name.toLowerCase().includes("canal") ||
          m.name.toLowerCase().includes("canal+")
      );

      if (existingCanalPlus) {
        console.log("Mission Canal+ déjà existante:", existingCanalPlus.id);
        return existingCanalPlus.id!;
      }

      // Créer la mission Canal+
      const missionData = {
        name: "Canal+",
        description: "Mission principale pour les ventes et contacts Canal+",
        users: [],
        isActive: true,
        createdBy: "system",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        allowSelfRegistration: false,
        maxUsers: 50,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const missionId = await missionService.createMission(missionData);
      console.log("Mission Canal+ créée avec l'ID:", missionId);

      return missionId;
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation de la mission Canal+:",
        error
      );
      throw error;
    }
  }

  /**
   * Initialise la mission Canal + CIV si elle n'existe pas déjà
   */
  async initializeCanalCIVMission(): Promise<string> {
    try {
      console.log("Initialisation de la mission Canal + CIV...");

      const missions = await missionService.getMissions();
      const existing = missions.find((m) =>
        m.name.toLowerCase().includes("canal + civ") ||
        m.name.toLowerCase().includes("canal+civ")
      );

      if (existing) {
        console.log("Mission Canal + CIV déjà existante:", existing.id);
        return existing.id!;
      }

      // Récupérer les superviseurs existants pour les assigner automatiquement
      let superviseurs: any[] = [];
      try {
        const allUsers = await userService.getUsers();
        superviseurs = allUsers.filter(
          (u: any) => u.customClaims?.superviseur === true || u.role === "superviseur"
        );
      } catch (err) {
        console.warn("Impossible de récupérer la liste des utilisateurs:", err);
        superviseurs = [];
      }

      const missionData: Omit<Mission, "id" | "createdAt" | "updatedAt"> = {
        name: "Canal + CIV",
        description: "Mission pour Canal + CIV (ventes et gestion)",
        users: superviseurs.map((u): MissionUser => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email,
          role: "supervisor",
          assignedAt: Timestamp.now(),
        })),
        isActive: true,
        createdBy: "system",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        allowSelfRegistration: false,
        maxUsers: 50,
      };

      const missionId = await missionService.createMission(missionData);
      console.log("Mission Canal + CIV créée avec l'ID:", missionId);

      // Initialiser les collections pour cette mission
      await this.initializeMissionCollections(missionId);

      return missionId;
    } catch (error) {
      console.error("Erreur lors de l'initialisation de la mission Canal + CIV:", error);
      throw error;
    }
  }

  /**
   * Initialise les collections de base pour une mission
   */
  async initializeMissionCollections(missionId: string): Promise<void> {
    try {
      console.log(
        `Initialisation des collections pour la mission ${missionId}...`
      );

      // Attendre un peu pour que les règles Firestore soient appliquées
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Créer les collections vides avec un document temporaire pour les initialiser
      const salesCollection = collection(db, "missions", missionId, "sales");
      const contactsCollection = collection(
        db,
        "missions",
        missionId,
        "contactsArgues"
      );
      const objectivesCollection = collection(
        db,
        "missions",
        missionId,
        "objectives"
      );

      // Ajouter des documents temporaires pour créer les collections
      const tempDoc = {
        temporary: true,
        createdAt: Timestamp.now(),
        note: "Document temporaire pour initialiser la collection - peut être supprimé",
      };

      // Initialiser les collections une par une pour éviter les erreurs
      try {
        await addDoc(salesCollection, { ...tempDoc, type: "sales" });
        console.log("Collection sales initialisée");
      } catch (error) {
        console.warn(
          "Erreur lors de l'initialisation de la collection sales:",
          error
        );
      }

      try {
        await addDoc(contactsCollection, {
          ...tempDoc,
          type: "contactsArgues",
        });
        console.log("Collection contactsArgues initialisée");
      } catch (error) {
        console.warn(
          "Erreur lors de l'initialisation de la collection contactsArgues:",
          error
        );
      }

      try {
        await addDoc(objectivesCollection, { ...tempDoc, type: "objectives" });
        console.log("Collection objectives initialisée");
      } catch (error) {
        console.warn(
          "Erreur lors de l'initialisation de la collection objectives:",
          error
        );
      }

      console.log("Collections initialisées pour la mission", missionId);
    } catch (error) {
      console.error("Erreur lors de l'initialisation des collections:", error);
      throw error;
    }
  }

  /**
   * Processus d'initialisation complet
   */
  async initializeSystem(): Promise<{
    missionId: string;
    message: string;
  }> {
    try {
      console.log("Démarrage de l'initialisation du système...");

      // 1. Initialiser la mission Canal+
      const missionId = await this.initializeCanalPlusMission();

      // 2. Initialiser les collections
      await this.initializeMissionCollections(missionId);

      const message =
        "Système initialisé avec succès. Mission Canal+ prête pour la migration des données.";
      console.log(message);

      return {
        missionId,
        message,
      };
    } catch (error) {
      console.error("Erreur lors de l'initialisation du système:", error);
      throw error;
    }
  }

  /**
   * Vérifie l'état d'initialisation du système
   */
  async checkInitializationStatus(): Promise<{
    canalPlusMissionExists: boolean;
    missionId?: string;
    collectionsInitialized: boolean;
  }> {
    try {
      const missions = await missionService.getMissions();
      const canalPlusMission = missions.find(
        (m) =>
          m.name.toLowerCase().includes("canal") ||
          m.name.toLowerCase().includes("canal+")
      );

      if (!canalPlusMission) {
        return {
          canalPlusMissionExists: false,
          collectionsInitialized: false,
        };
      }

      // TODO: Vérifier si les collections sont initialisées
      // Pour l'instant, on suppose qu'elles le sont si la mission existe
      return {
        canalPlusMissionExists: true,
        missionId: canalPlusMission.id,
        collectionsInitialized: true,
      };
    } catch (error) {
      console.error(
        "Erreur lors de la vérification du statut d'initialisation:",
        error
      );
      throw error;
    }
  }
}

export default new InitializationService();
