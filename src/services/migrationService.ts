import {
  collection,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

class MigrationService {
  /**
   * Copie les ventes non assignées vers une mission spécifique (SANS les supprimer)
   */
  async migrateSalesToMission(missionId: string): Promise<number> {
    try {
      console.log(`Copie des ventes vers la mission ${missionId}`);

      // 1. Récupérer toutes les ventes sans missionId (ou avec missionId null/undefined)
      const salesCollection = collection(db, "sales");
      // Récupérer toutes les ventes d'abord, puis filtrer côté client
      const salesSnapshot = await getDocs(salesCollection);

      // Filtrer les ventes qui n'ont pas de missionId ou qui ont un missionId null
      const unassignedSales = salesSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.missionId || data.missionId === null;
      });

      if (unassignedSales.length === 0) {
        console.log("Aucune vente à copier");
        return 0;
      }

      // 2. Créer une collection sales spécifique à la mission
      const missionSalesCollection = collection(
        db,
        "missions",
        missionId,
        "sales"
      );

      const batch = writeBatch(db);
      let copiedCount = 0;

      // 3. Pour chaque vente, l'ajouter à la collection de la mission ET marquer l'original comme assigné
      for (const saleDoc of unassignedSales) {
        const saleData = saleDoc.data();

        // Ajouter à la collection de la mission
        const newSaleRef = doc(missionSalesCollection);
        batch.set(newSaleRef, {
          ...saleData,
          missionId,
          copiedAt: Timestamp.now(),
          originalId: saleDoc.id, // Garder une référence à l'original
        });

        // Marquer l'original comme assigné (au lieu de le supprimer)
        batch.update(saleDoc.ref, {
          missionId,
          assignedAt: Timestamp.now(),
        });

        copiedCount++;
      }

      await batch.commit();
      console.log(`${copiedCount} ventes copiées vers la mission ${missionId}`);

      return copiedCount;
    } catch (error) {
      console.error("Erreur lors de la copie des ventes:", error);
      throw error;
    }
  }

  /**
   * Copie les contacts argumentés non assignés vers une mission spécifique (SANS les supprimer)
   */
  async migrateContactsToMission(missionId: string): Promise<number> {
    try {
      console.log(`Copie des contacts argumentés vers la mission ${missionId}`);

      // 1. Récupérer tous les contacts sans missionId (ou avec missionId null/undefined)
      const contactsCollection = collection(db, "contactsArgues");
      const contactsSnapshot = await getDocs(contactsCollection);

      // Filtrer les contacts qui n'ont pas de missionId ou qui ont un missionId null
      const unassignedContacts = contactsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.missionId || data.missionId === null;
      });

      if (unassignedContacts.length === 0) {
        console.log("Aucun contact argumenté à copier");
        return 0;
      }

      // 2. Créer une collection contactsArgues spécifique à la mission
      const missionContactsCollection = collection(
        db,
        "missions",
        missionId,
        "contactsArgues"
      );

      const batch = writeBatch(db);
      let copiedCount = 0;

      // 3. Pour chaque contact, l'ajouter à la collection de la mission ET marquer l'original comme assigné
      for (const contactDoc of unassignedContacts) {
        const contactData = contactDoc.data();

        // Ajouter à la collection de la mission
        const newContactRef = doc(missionContactsCollection);
        batch.set(newContactRef, {
          ...contactData,
          missionId,
          copiedAt: Timestamp.now(),
          originalId: contactDoc.id,
        });

        // Marquer l'original comme assigné (au lieu de le supprimer)
        batch.update(contactDoc.ref, {
          missionId,
          assignedAt: Timestamp.now(),
        });

        copiedCount++;
      }

      await batch.commit();
      console.log(
        `${copiedCount} contacts argumentés copiés vers la mission ${missionId}`
      );

      return copiedCount;
    } catch (error) {
      console.error("Erreur lors de la copie des contacts argumentés:", error);
      throw error;
    }
  }

  /**
   * Copie les objectifs non assignés vers une mission spécifique (SANS les supprimer)
   */
  async migrateObjectivesToMission(missionId: string): Promise<number> {
    try {
      console.log(`Copie des objectifs vers la mission ${missionId}`);

      // 1. Récupérer tous les objectifs sans missionId ou avec missionId null/undefined
      const objectivesCollection = collection(db, "objectives");
      const objectivesSnapshot = await getDocs(objectivesCollection);

      // Filtrer les objectifs qui n'ont pas de missionId ou qui ont un missionId null
      const unassignedObjectives = objectivesSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.missionId || data.missionId === null;
      });

      if (unassignedObjectives.length === 0) {
        console.log("Aucun objectif à copier");
        return 0;
      }

      // 2. Créer une collection objectives spécifique à la mission
      const missionObjectivesCollection = collection(
        db,
        "missions",
        missionId,
        "objectives"
      );

      const batch = writeBatch(db);
      let copiedCount = 0;

      // 3. Pour chaque objectif, l'ajouter à la collection de la mission ET marquer l'original comme assigné
      for (const objectiveDoc of unassignedObjectives) {
        const objectiveData = objectiveDoc.data();

        // Ajouter à la collection de la mission
        const newObjectiveRef = doc(missionObjectivesCollection);
        batch.set(newObjectiveRef, {
          ...objectiveData,
          missionId,
          copiedAt: Timestamp.now(),
          originalId: objectiveDoc.id,
        });

        // Marquer l'original comme assigné (au lieu de le supprimer)
        batch.update(objectiveDoc.ref, {
          missionId,
          assignedAt: Timestamp.now(),
        });

        copiedCount++;
      }

      await batch.commit();
      console.log(
        `${copiedCount} objectifs copiés vers la mission ${missionId}`
      );

      return copiedCount;
    } catch (error) {
      console.error("Erreur lors de la copie des objectifs:", error);
      throw error;
    }
  }

  /**
   * ========== FONCTIONS INVERSES : RÉCUPÉRER LES DONNÉES DEPUIS LES MISSIONS ==========
   */

  /**
   * Copie les ventes d'une mission vers la collection globale
   */
  async restoreSalesFromMission(missionId: string): Promise<number> {
    try {
      console.log(`Récupération des ventes depuis la mission ${missionId}`);

      const missionSalesCollection = collection(
        db,
        "missions",
        missionId,
        "sales"
      );
      const salesSnapshot = await getDocs(missionSalesCollection);

      if (salesSnapshot.empty) {
        console.log("Aucune vente à récupérer");
        return 0;
      }

      const globalSalesCollection = collection(db, "sales");
      const batch = writeBatch(db);
      let restoredCount = 0;

      for (const saleDoc of salesSnapshot.docs) {
        const saleData = saleDoc.data();

        // Créer dans la collection globale (sans missionId)
        const newSaleRef = doc(globalSalesCollection);
        const {
          missionId: _,
          copiedAt,
          originalId,
          ...cleanSaleData
        } = saleData;

        batch.set(newSaleRef, {
          ...cleanSaleData,
          restoredAt: Timestamp.now(),
          fromMission: missionId,
        });

        restoredCount++;
      }

      await batch.commit();
      console.log(
        `${restoredCount} ventes récupérées depuis la mission ${missionId}`
      );

      return restoredCount;
    } catch (error) {
      console.error("Erreur lors de la récupération des ventes:", error);
      throw error;
    }
  }

  /**
   * Copie les contacts argumentés d'une mission vers la collection globale
   */
  async restoreContactsFromMission(missionId: string): Promise<number> {
    try {
      console.log(`Récupération des contacts depuis la mission ${missionId}`);

      const missionContactsCollection = collection(
        db,
        "missions",
        missionId,
        "contactsArgues"
      );
      const contactsSnapshot = await getDocs(missionContactsCollection);

      if (contactsSnapshot.empty) {
        console.log("Aucun contact à récupérer");
        return 0;
      }

      const globalContactsCollection = collection(db, "contactsArgues");
      const batch = writeBatch(db);
      let restoredCount = 0;

      for (const contactDoc of contactsSnapshot.docs) {
        const contactData = contactDoc.data();

        // Créer dans la collection globale (sans missionId)
        const newContactRef = doc(globalContactsCollection);
        const {
          missionId: _,
          copiedAt,
          originalId,
          ...cleanContactData
        } = contactData;

        batch.set(newContactRef, {
          ...cleanContactData,
          restoredAt: Timestamp.now(),
          fromMission: missionId,
        });

        restoredCount++;
      }

      await batch.commit();
      console.log(
        `${restoredCount} contacts récupérés depuis la mission ${missionId}`
      );

      return restoredCount;
    } catch (error) {
      console.error("Erreur lors de la récupération des contacts:", error);
      throw error;
    }
  }

  /**
   * Copie les objectifs d'une mission vers la collection globale
   */
  async restoreObjectivesFromMission(missionId: string): Promise<number> {
    try {
      console.log(`Récupération des objectifs depuis la mission ${missionId}`);

      const missionObjectivesCollection = collection(
        db,
        "missions",
        missionId,
        "objectives"
      );
      const objectivesSnapshot = await getDocs(missionObjectivesCollection);

      if (objectivesSnapshot.empty) {
        console.log("Aucun objectif à récupérer");
        return 0;
      }

      const globalObjectivesCollection = collection(db, "objectives");
      const batch = writeBatch(db);
      let restoredCount = 0;

      for (const objectiveDoc of objectivesSnapshot.docs) {
        const objectiveData = objectiveDoc.data();

        // Créer dans la collection globale (sans missionId)
        const newObjectiveRef = doc(globalObjectivesCollection);
        const {
          missionId: _,
          copiedAt,
          originalId,
          ...cleanObjectiveData
        } = objectiveData;

        batch.set(newObjectiveRef, {
          ...cleanObjectiveData,
          restoredAt: Timestamp.now(),
          fromMission: missionId,
        });

        restoredCount++;
      }

      await batch.commit();
      console.log(
        `${restoredCount} objectifs récupérés depuis la mission ${missionId}`
      );

      return restoredCount;
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs:", error);
      throw error;
    }
  }

  /**
   * Migre toutes les données non assignées vers une mission spécifique
   */
  async migrateAllDataToMission(missionId: string): Promise<{
    sales: number;
    contacts: number;
    objectives: number;
  }> {
    try {
      const salesCount = await this.migrateSalesToMission(missionId);
      const contactsCount = await this.migrateContactsToMission(missionId);
      const objectivesCount = await this.migrateObjectivesToMission(missionId);

      return {
        sales: salesCount,
        contacts: contactsCount,
        objectives: objectivesCount,
      };
    } catch (error) {
      console.error("Erreur lors de la migration complète:", error);
      throw error;
    }
  }

  /**
   * Obtient le statut de migration pour une mission
   */
  async getMigrationStatus(missionId: string): Promise<{
    sales: number;
    contacts: number;
    objectives: number;
  }> {
    try {
      // Compter les éléments dans chaque collection de la mission
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

      const [salesSnapshot, contactsSnapshot, objectivesSnapshot] =
        await Promise.all([
          getDocs(salesCollection),
          getDocs(contactsCollection),
          getDocs(objectivesCollection),
        ]);

      return {
        sales: salesSnapshot.size,
        contacts: contactsSnapshot.size,
        objectives: objectivesSnapshot.size,
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du statut de migration:",
        error
      );
      throw error;
    }
  }

  /**
   * Obtient le nombre d'éléments non assignés dans les collections globales
   */
  async getUnassignedDataCount(): Promise<{
    sales: number;
    contacts: number;
    objectives: number;
  }> {
    try {
      const salesCollection = collection(db, "sales");
      const contactsArguesCollection = collection(db, "contactsArgues");
      const objectivesGlobalCollection = collection(db, "objectives");

      // Pour les ventes, on doit récupérer toutes les ventes et filtrer côté client
      const salesSnapshot = await getDocs(salesCollection);
      const unassignedSales = salesSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.missionId || data.missionId === null;
      });

      // Pour les contacts et objectifs, on peut utiliser des requêtes normales
      const contactsSnapshot = await getDocs(contactsArguesCollection);
      const unassignedContacts = contactsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.missionId || data.missionId === null;
      });

      const objectivesSnapshot = await getDocs(objectivesGlobalCollection);
      const unassignedObjectives = objectivesSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.missionId || data.missionId === null;
      });

      return {
        sales: unassignedSales.length,
        contacts: unassignedContacts.length,
        objectives: unassignedObjectives.length,
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du nombre d'éléments non assignés:",
        error
      );
      throw error;
    }
  }
}

export default new MigrationService();
