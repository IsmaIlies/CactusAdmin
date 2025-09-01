import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Objective } from "./objectiveService";

class RealTimeObjectiveService {
  private unsubscribeFunctions: Array<() => void> = [];

  /**
   * Écoute les objectifs actifs en temps réel
   */
  onActiveObjectivesChange(callback: (objectives: Objective[]) => void): () => void {
    const q = query(
      collection(db, "objectives"),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const objectives: Objective[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        objectives.push({
          id: doc.id,
          ...data,
        } as Objective);
      });
      callback(objectives);
    }, (error) => {
      console.error("Erreur lors de l'écoute des objectifs:", error);
    });

    this.unsubscribeFunctions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Écoute tous les objectifs en temps réel
   */
  onAllObjectivesChange(callback: (objectives: Objective[]) => void): () => void {
    const q = query(
      collection(db, "objectives"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const objectives: Objective[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        objectives.push({
          id: doc.id,
          ...data,
        } as Objective);
      });
      callback(objectives);
    }, (error) => {
      console.error("Erreur lors de l'écoute des objectifs:", error);
    });

    this.unsubscribeFunctions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Nettoie toutes les souscriptions
   */
  cleanup(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
  }
}

export default new RealTimeObjectiveService();
