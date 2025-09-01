import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

export interface MissionUser {
  uid: string;
  email: string;
  displayName?: string;
  role: "ta" | "supervisor" | "admin";
  assignedAt: Timestamp;
}

export interface Mission {
  id?: string;
  name: string;
  description?: string;
  users: MissionUser[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  // Dates de la mission
  startDate?: string; // Format YYYY-MM-DD
  endDate?: string; // Format YYYY-MM-DD
  // Configuration
  allowSelfRegistration?: boolean;
  maxUsers?: number;
}

export interface MissionStats {
  missionId: string;
  period: string; // Format YYYY-MM pour mois, YYYY-MM-DD pour semaine
  periodType: "month" | "week";
  stats: {
    sales: number;
    contactsArgues: number;
    [key: string]: number;
  };
  users: {
    [userId: string]: {
      sales: number;
      contactsArgues: number;
      [key: string]: number;
    };
  };
  updatedAt: Timestamp;
}

class MissionService {
  private missionsCollection = collection(db, "missions");
  private missionStatsCollection = collection(db, "missionStats");

  /**
   * Récupère toutes les missions
   */
  async getMissions(): Promise<Mission[]> {
    try {
      const q = query(this.missionsCollection, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Mission[];
    } catch (error) {
      console.error("Erreur lors de la récupération des missions:", error);
      throw error;
    }
  }

  /**
   * Récupère les missions auxquelles un utilisateur est assigné
   */
  async getUserMissions(userId: string): Promise<Mission[]> {
    try {
      const allMissions = await this.getMissions();
      return allMissions.filter((mission) =>
        mission.users.some((user) => user.uid === userId)
      );
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des missions de l'utilisateur:",
        error
      );
      throw error;
    }
  }

  /**
   * Récupère les missions actives
   */
  async getActiveMissions(): Promise<Mission[]> {
    try {
      const q = query(
        this.missionsCollection,
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Mission[];
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des missions actives:",
        error
      );
      throw error;
    }
  }

  /**
   * Récupère une mission par ID
   */
  async getMissionById(missionId: string): Promise<Mission | null> {
    try {
      const docRef = doc(this.missionsCollection, missionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Mission;
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération de la mission:", error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle mission
   */
  async createMission(
    missionData: Omit<Mission, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      const mission: Omit<Mission, "id"> = {
        ...missionData,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(this.missionsCollection, mission);

      // Mettre à jour les claims des utilisateurs assignés
      await this.updateUserClaims(docRef.id, missionData.users);

      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création de la mission:", error);
      throw error;
    }
  }

  /**
   * Met à jour une mission
   */
  async updateMission(
    missionId: string,
    updates: Partial<Mission>
  ): Promise<void> {
    try {
      const docRef = doc(this.missionsCollection, missionId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      // Si on met à jour les utilisateurs, mettre à jour les claims
      if (updates.users) {
        await this.updateUserClaims(missionId, updates.users);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la mission:", error);
      throw error;
    }
  }

  /**
   * Supprime une mission
   */
  async deleteMission(missionId: string): Promise<void> {
    try {
      // Récupérer la mission pour obtenir les utilisateurs
      const mission = await this.getMissionById(missionId);
      if (mission) {
        // Supprimer les claims des utilisateurs
        await this.removeUserClaims(missionId, mission.users);
      }

      // Supprimer la mission
      const docRef = doc(this.missionsCollection, missionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erreur lors de la suppression de la mission:", error);
      throw error;
    }
  }

  /**
   * Ajoute un utilisateur à une mission
   */
  async addUserToMission(missionId: string, user: MissionUser): Promise<void> {
    try {
      const mission = await this.getMissionById(missionId);
      if (!mission) {
        throw new Error("Mission not found");
      }

      // Vérifier si l'utilisateur n'est pas déjà dans la mission
      const existingUser = mission.users.find((u) => u.uid === user.uid);
      if (existingUser) {
        throw new Error("L'utilisateur est déjà assigné à cette mission");
      }

      const updatedUsers = [...mission.users, user];
      await this.updateMission(missionId, { users: updatedUsers });
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'utilisateur:", error);
      throw error;
    }
  }

  /**
   * Retire un utilisateur d'une mission
   */
  async removeUserFromMission(
    missionId: string,
    userId: string
  ): Promise<void> {
    try {
      const mission = await this.getMissionById(missionId);
      if (!mission) {
        throw new Error("Mission not found");
      }

      const updatedUsers = mission.users.filter((u) => u.uid !== userId);
      await this.updateMission(missionId, { users: updatedUsers });

      // Supprimer les claims de cet utilisateur pour cette mission
      await this.removeUserClaims(missionId, [{ uid: userId } as MissionUser]);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      throw error;
    }
  }

  /**
   * Met à jour les claims des utilisateurs via Cloud Function
   */
  private async updateUserClaims(
    missionId: string,
    users: MissionUser[]
  ): Promise<void> {
    try {
      const functions = getFunctions(app, "europe-west9");
      const updateMissionClaims = httpsCallable(
        functions,
        "updateMissionClaims"
      );

      await updateMissionClaims({
        missionId,
        users: users.map((user) => ({
          uid: user.uid,
          role: user.role,
        })),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des claims:", error);
      // Fonction Cloud non disponible - continuer sans mise à jour des claims
      console.warn(
        "Fonction Cloud updateMissionClaims non disponible, mission créée sans claims"
      );
    }
  }

  /**
   * Supprime les claims des utilisateurs via Cloud Function
   */
  private async removeUserClaims(
    missionId: string,
    users: MissionUser[]
  ): Promise<void> {
    try {
      const functions = getFunctions(app, "europe-west9");
      const removeMissionClaims = httpsCallable(
        functions,
        "removeMissionClaims"
      );

      await removeMissionClaims({
        missionId,
        userIds: users.map((user) => user.uid),
      });
    } catch (error) {
      console.error("Erreur lors de la suppression des claims:", error);
      // Ne pas faire échouer la suppression de la mission pour cela
    }
  }

  /**
   * Récupère les statistiques d'une mission pour une période
   */
  async getMissionStats(
    missionId: string,
    period: string,
    periodType: "month" | "week"
  ): Promise<MissionStats | null> {
    try {
      const q = query(
        this.missionStatsCollection,
        where("missionId", "==", missionId),
        where("period", "==", period),
        where("periodType", "==", periodType)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          ...doc.data(),
        } as MissionStats;
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw error;
    }
  }

  /**
   * Recherche un utilisateur par email
   */
  async findUserByEmail(email: string): Promise<any> {
    try {
      const functions = getFunctions(app, "europe-west9");
      const findUserByEmail = httpsCallable(functions, "findUserByEmail");

      const result = await findUserByEmail({ email });
      const data = result.data as {
        success: boolean;
        user?: any;
        message?: string;
      };

      if (data.success && data.user) {
        return data.user;
      } else {
        throw new Error("Utilisateur non trouvé");
      }
    } catch (error: any) {
      console.error("Erreur lors de la recherche d'utilisateur:", error);
      throw error;
    }
  }

  /**
   * Valide les données d'une mission
   */
  validateMission(mission: Partial<Mission>): string[] {
    const errors: string[] = [];

    if (!mission.name || mission.name.trim().length < 3) {
      errors.push("Le nom de la mission doit contenir au moins 3 caractères");
    }

    return errors;
  }
}

export default new MissionService();
