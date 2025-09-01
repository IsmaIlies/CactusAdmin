import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Sale } from "./salesService";

class RealTimeSalesService {
  private unsubscribeFunctions: Array<() => void> = [];

  /**
   * Écoute les ventes en temps réel avec consentement
   */
  onSalesWithConsentChange(callback: (sales: Sale[]) => void): () => void {
    const q = query(
      collection(db, "sales"),
      where("consent", "==", "yes"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: Sale[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          id: doc.id,
          ...data,
        } as Sale);
      });
      callback(sales);
    }, (error) => {
      console.error("Erreur lors de l'écoute des ventes:", error);
    });

    this.unsubscribeFunctions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Écoute toutes les ventes en temps réel
   */
  onAllSalesChange(callback: (sales: Sale[]) => void): () => void {
    const q = query(
      collection(db, "sales"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: Sale[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          id: doc.id,
          ...data,
        } as Sale);
      });
      callback(sales);
    }, (error) => {
      console.error("Erreur lors de l'écoute des ventes:", error);
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

export default new RealTimeSalesService();
