import React, { useState, useEffect } from "react";
import salesService, { ContactsArgues } from "../../services/salesService";
import { Users, TrendingUp, Calendar, Target } from "lucide-react";

interface ContactsArguesModuleProps {
  sales: Array<any>; // Ventes avec consentement "yes"
}

const ContactsArguesModule: React.FC<ContactsArguesModuleProps> = ({
  sales,
}) => {
  const [contactsArgues, setContactsArgues] = useState<ContactsArgues[]>([]);
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
        setContactsArgues(contactsData);
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

  // Calcul des statistiques
  const calculateStats = () => {
    if (contactsArgues.length === 0) {
      return {
        totalContacts: 0,
        dailyAverage: 0,
        conversionRate: 0,
        dailyConversionRates: [],
        bestDayRate: 0,
        worstDayRate: 0,
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrer les contacts argumentés pour s'assurer qu'ils sont du mois en cours
    const currentMonthContacts = contactsArgues.filter((ca) => {
      const caDate = new Date(ca.date);
      return (
        caDate.getMonth() === currentMonth &&
        caDate.getFullYear() === currentYear
      );
    });

    // Total des contacts argumentés du mois en cours
    const totalContacts = currentMonthContacts.reduce(
      (sum, contact) => sum + contact.count,
      0
    );

    // Moyenne journalière (basée sur les jours où il y a eu des contacts)
    const dailyAverage =
      currentMonthContacts.length > 0
        ? totalContacts / currentMonthContacts.length
        : 0;

    // Filtrer les ventes du mois en cours
    const currentMonthSales = sales.filter((sale) => {
      if (!sale.date) return false;
      const saleDate = sale.date?.toDate
        ? sale.date.toDate()
        : new Date(sale.date);
      return (
        saleDate.getMonth() === currentMonth &&
        saleDate.getFullYear() === currentYear
      );
    });

    // Taux de concrétisation global : (ventes du mois / contacts argumentés du mois) * 100
    const conversionRate =
      totalContacts > 0 ? (currentMonthSales.length / totalContacts) * 100 : 0;

    // Calcul des taux de concrétisation journaliers
    const dailyStats = currentMonthContacts.map((contact) => {
      const contactDate = contact.date;

      // Compter les ventes pour ce jour spécifique
      const salesOnThisDay = currentMonthSales.filter((sale) => {
        const saleDate = sale.date?.toDate
          ? sale.date.toDate()
          : new Date(sale.date);
        return saleDate.toISOString().split("T")[0] === contactDate;
      });

      // Calculer le taux de concrétisation pour ce jour
      const dailyRate =
        contact.count > 0 ? (salesOnThisDay.length / contact.count) * 100 : 0;

      return {
        date: contactDate,
        contactCount: contact.count,
        salesCount: salesOnThisDay.length,
        conversionRate: dailyRate,
      };
    });

    // Trouver le meilleur et le pire taux de concrétisation
    const validRates = dailyStats
      .filter((day) => day.contactCount > 0)
      .map((day) => day.conversionRate);
    const bestDayRate = validRates.length > 0 ? Math.max(...validRates) : 0;
    const worstDayRate = validRates.length > 0 ? Math.min(...validRates) : 0;

    return {
      totalContacts,
      dailyAverage: Math.round(dailyAverage * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      dailyConversionRates: dailyStats,
      bestDayRate: Math.round(bestDayRate * 10) / 10,
      worstDayRate: Math.round(worstDayRate * 10) / 10,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total des contacts argumentés */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Total contacts argumentés
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.totalContacts}
              </p>
              <p className="text-xs text-blue-500 mt-1">Mois en cours</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Moyenne journalière */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">
                Moyenne journalière
              </p>
              <p className="text-2xl font-bold text-green-900">
                {stats.dailyAverage}
              </p>
              <p className="text-xs text-green-500 mt-1">Contacts/jour</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Taux de concrétisation */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">
                Taux de concrétisation
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {stats.conversionRate}%
              </p>
              <p className="text-xs text-purple-500 mt-1">Ventes/Contacts</p>
            </div>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Détails supplémentaires */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">
            Détails du mois en cours
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Jours avec activité</p>
            <p className="font-semibold text-gray-900">
              {stats.dailyConversionRates.length}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Ventes du mois</p>
            <p className="font-semibold text-gray-900">
              {
                sales.filter((sale) => {
                  if (!sale.date) return false;
                  const saleDate = sale.date?.toDate
                    ? sale.date.toDate()
                    : new Date(sale.date);
                  const now = new Date();
                  return (
                    saleDate.getMonth() === now.getMonth() &&
                    saleDate.getFullYear() === now.getFullYear()
                  );
                }).length
              }
            </p>
          </div>
          <div>
            <p className="text-gray-600">Meilleur taux</p>
            <p className="font-semibold text-gray-900">{stats.bestDayRate}%</p>
          </div>
          <div>
            <p className="text-gray-600">Taux le plus bas</p>
            <p className="font-semibold text-gray-900">{stats.worstDayRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsArguesModule;
