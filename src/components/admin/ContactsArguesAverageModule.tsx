import React, { useState, useEffect } from "react";
import salesService from "../../services/salesService";
import { Calendar } from "lucide-react";

const ContactsArguesAverageModule: React.FC = () => {
  const [dailyAverage, setDailyAverage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContactsArgues = async () => {
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

        const contactsData = await salesService.getContactsArguesForPeriod(
          startDate,
          endDate
        );
        const totalContacts = contactsData.reduce(
          (sum, contact) => sum + contact.count,
          0
        );
        const average =
          contactsData.length > 0 ? totalContacts / contactsData.length : 0;
        setDailyAverage(Math.round(average * 10) / 10);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des contacts argumentés:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContactsArgues();
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
            Moyenne journalière
          </p>
          <p className="text-2xl font-bold text-gray-900">{dailyAverage}</p>
          <p className="text-xs text-gray-500 mt-1">Contacts/jour</p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsArguesAverageModule;
