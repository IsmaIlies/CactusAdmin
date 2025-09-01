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
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

// Interface pour les contacts argumentés
export interface ContactArgue {
  id?: string;
  date: string;
  count: number;
  updatedAt: Timestamp;
  updatedBy: string;
  // Autres champs spécifiques aux contacts argumentés
}

// Interface pour les ventes
export interface Sale {
  id?: string;
  date: string;
  count: number;
  updatedAt: Timestamp;
  updatedBy: string;
  // Autres champs spécifiques aux ventes
}

class MissionDataService {
  // Contacts argumentés d'une mission
  async getContactsArgues(missionId: string): Promise<ContactArgue[]> {
    try {
      const contactsArguesRef = collection(
        db,
        "missions",
        missionId,
        "contactsArgues"
      );
      const q = query(contactsArguesRef, orderBy("date", "desc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ContactArgue[];
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des contacts argumentés:",
        error
      );
      throw error;
    }
  }

  async addContactArgue(
    missionId: string,
    contactArgue: Omit<ContactArgue, "id" | "updatedAt">
  ): Promise<string> {
    try {
      const contactsArguesRef = collection(
        db,
        "missions",
        missionId,
        "contactsArgues"
      );
      const docRef = await addDoc(contactsArguesRef, {
        ...contactArgue,
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de l'ajout du contact argumenté:", error);
      throw error;
    }
  }

  async updateContactArgue(
    missionId: string,
    contactArgueId: string,
    updates: Partial<ContactArgue>
  ): Promise<void> {
    try {
      const contactArgueRef = doc(
        db,
        "missions",
        missionId,
        "contactsArgues",
        contactArgueId
      );
      await updateDoc(contactArgueRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du contact argumenté:",
        error
      );
      throw error;
    }
  }

  async deleteContactArgue(
    missionId: string,
    contactArgueId: string
  ): Promise<void> {
    try {
      const contactArgueRef = doc(
        db,
        "missions",
        missionId,
        "contactsArgues",
        contactArgueId
      );
      await deleteDoc(contactArgueRef);
    } catch (error) {
      console.error(
        "Erreur lors de la suppression du contact argumenté:",
        error
      );
      throw error;
    }
  }

  // Ventes d'une mission
  async getSales(missionId: string): Promise<Sale[]> {
    try {
      const salesRef = collection(db, "missions", missionId, "sales");
      const q = query(salesRef, orderBy("date", "desc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[];
    } catch (error) {
      console.error("Erreur lors de la récupération des ventes:", error);
      throw error;
    }
  }

  async addSale(
    missionId: string,
    sale: Omit<Sale, "id" | "updatedAt">
  ): Promise<string> {
    try {
      const salesRef = collection(db, "missions", missionId, "sales");
      const docRef = await addDoc(salesRef, {
        ...sale,
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de l'ajout de la vente:", error);
      throw error;
    }
  }

  async updateSale(
    missionId: string,
    saleId: string,
    updates: Partial<Sale>
  ): Promise<void> {
    try {
      const saleRef = doc(db, "missions", missionId, "sales", saleId);
      await updateDoc(saleRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la vente:", error);
      throw error;
    }
  }

  async deleteSale(missionId: string, saleId: string): Promise<void> {
    try {
      const saleRef = doc(db, "missions", missionId, "sales", saleId);
      await deleteDoc(saleRef);
    } catch (error) {
      console.error("Erreur lors de la suppression de la vente:", error);
      throw error;
    }
  }

  // Statistiques pour une mission
  async getMissionStats(missionId: string): Promise<{
    totalContactsArgues: number;
    totalSales: number;
    contactsArguesThisMonth: number;
    salesThisMonth: number;
    contactsArguesThisWeek: number;
    salesThisWeek: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

      const contactsArgues = await this.getContactsArgues(missionId);
      const sales = await this.getSales(missionId);

      const contactsArguesThisMonth = contactsArgues
        .filter((c) => new Date(c.date) >= startOfMonth)
        .reduce((sum, c) => sum + c.count, 0);

      const salesThisMonth = sales
        .filter((s) => new Date(s.date) >= startOfMonth)
        .reduce((sum, s) => sum + s.count, 0);

      const contactsArguesThisWeek = contactsArgues
        .filter((c) => new Date(c.date) >= startOfWeek)
        .reduce((sum, c) => sum + c.count, 0);

      const salesThisWeek = sales
        .filter((s) => new Date(s.date) >= startOfWeek)
        .reduce((sum, s) => sum + s.count, 0);

      return {
        totalContactsArgues: contactsArgues.reduce(
          (sum, c) => sum + c.count,
          0
        ),
        totalSales: sales.reduce((sum, s) => sum + s.count, 0),
        contactsArguesThisMonth,
        salesThisMonth,
        contactsArguesThisWeek,
        salesThisWeek,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw error;
    }
  }
}

export default new MissionDataService();
