import React, { useState, useEffect } from "react";
import salesService from "../../services/salesService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Target } from "lucide-react";

const ConversionRateModule: React.FC = () => {
  const [conversionRate, setConversionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversionRate = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Premier jour du mois
        const firstDay = new Date(currentYear, currentMonth, 1);
        const startDate = firstDay.toISOString().split("T")[0];

        // Dernier jour du mois
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const endDate = lastDay.toISOString().split("T")[0];

        // Récupérer les contacts argumentés du mois
        const contactsData = await salesService.getContactsArguesForPeriod(
          startDate,
          endDate
        );
        const totalContacts = contactsData.reduce(
          (sum, contact) => sum + contact.count,
          0
        );

        // Récupérer les ventes du mois avec consentement "yes"
        const salesRef = collection(db, "sales");
        const salesQuery = query(salesRef, where("consentement", "==", "yes"));

        const salesSnapshot = await getDocs(salesQuery);
        const salesData = salesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as any[];

        // Filtrer les ventes du mois en cours
        const currentMonthSales = salesData.filter((sale: any) => {
          const saleDate = sale.date?.toDate
            ? sale.date.toDate()
            : new Date(sale.date);
          return (
            saleDate.getMonth() === currentMonth &&
            saleDate.getFullYear() === currentYear
          );
        });

        const rate =
          totalContacts > 0
            ? (currentMonthSales.length / totalContacts) * 100
            : 0;
        setConversionRate(Math.round(rate * 10) / 10);
      } catch (error) {
        console.error(
          "Erreur lors du calcul du taux de concrétisation:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConversionRate();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">
            Taux de concrétisation
          </p>
          <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Ventes/Contacts</p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Target className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionRateModule;
