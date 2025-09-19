console.log("AdminDashboard monté !");

import React, { useState, useEffect } from "react";
import salesService, { Sale, OFFERS } from "../services/salesService";
// import realTimeSalesService from "../services/realTimeSalesService";
import { DragDropProvider } from "../components/admin/DragDropProvider";
import DraggableModule from "../components/admin/DraggableModule";
import VentesObjectifsModule from "../components/admin/VentesObjectifsModule";
import ContactsArguesModule from "../components/admin/ContactsArguesModule";
import InteractiveChartModule from "../components/admin/InteractiveChartModule";
import RecentSalesModule from "../components/admin/RecentSalesModule";
import TopSellersModule from "../components/admin/TopSellersModule";

interface ModuleConfig {
  id: string;
  title: string;
  component: string;
  position: number;
}

const AdminDashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  // Ajout: ventes validées + validées soft pour l'affichage Ventes & Objectifs
  const [combinedValidatedSales, setCombinedValidatedSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [modules, setModules] = useState<ModuleConfig[]>([
    {
      id: "ventes-objectifs",
      title: "Ventes & Objectifs",
      component: "VentesObjectifsModule",
      position: 0,
    },
    {
      id: "contacts-argues",
      title: "Contacts argumentés & Taux de concrétisation",
      component: "ContactsArguesModule",
      position: 2,
    },
    {
      id: "interactive-chart",
      title: "Graphique interactif",
      component: "InteractiveChartModule",
      position: 3,
    },
    {
      id: "recent-sales",
      title: "Dernières ventes du jour",
      component: "RecentSalesModule",
      position: 4,
    },
    {
      id: "top-sellers",
      title: "Top vendeurs",
      component: "TopSellersModule",
      position: 5,
    }, 
  ]);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      salesService.getSalesWithStatus("valide"),
      salesService.getSalesWithFilters({ orderStatus: ["valide", "validation_soft"] }),
    ])
      .then(([validSales, combined]) => {
        setSales(validSales);
        setCombinedValidatedSales(combined);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur lors du chargement des ventes");
        setLoading(false);
      });
  }, []);

  // Affichage du chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  // Calcul des statistiques via le service (pour compatibilité avec les anciens composants)
  // Utilise les ventes validées + validées soft pour les compteurs Ventes & Objectifs
  const salesStats = salesService.getSalesStats(combinedValidatedSales.length ? combinedValidatedSales : sales);
  const sellers = salesService.getSellers(sales);

  // Filtrer les sales qui ont un userId pour les modules
  const salesWithUserId = sales.filter(
    (sale): sale is Sale & { userId: string } => !!sale.userId
  );

  const handleModuleMove = (fromId: string, toId: string) => {
    const fromIndex = modules.findIndex((m) => m.id === fromId);
    const toIndex = modules.findIndex((m) => m.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newModules = [...modules];
    const [movedModule] = newModules.splice(fromIndex, 1);
    newModules.splice(toIndex, 0, movedModule);

    // Réorganiser les positions
    const updatedModules = newModules.map((module, index) => ({
      ...module,
      position: index,
    }));

    setModules(updatedModules);
  };

  const renderModule = (module: ModuleConfig) => {
    switch (module.component) {
      case "VentesObjectifsModule":
        return (
          <VentesObjectifsModule
            dailySales={salesStats.dailySales}
            weeklySales={salesStats.weeklySales}
            monthlySales={salesStats.monthlySales}
          />
        );
      case "ContactsArguesModule":
        return <ContactsArguesModule sales={salesWithUserId} />;
      case "InteractiveChartModule":
        return (
          <InteractiveChartModule
            sales={salesWithUserId}
            offers={OFFERS}
            sellers={sellers}
          />
        );
      case "RecentSalesModule":
        return <RecentSalesModule sales={salesWithUserId} offers={OFFERS} />;
      case "TopSellersModule":
        return <TopSellersModule sales={salesWithUserId} />;
      default:
        return <div>Module non trouvé</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Erreur</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  const sortedModules = modules.sort((a, b) => a.position - b.position);

  return (
    <DragDropProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <div className="text-sm text-gray-500">
            Glissez-déposez les modules pour les réorganiser
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedModules.map((module) => (
            <DraggableModule
              key={module.id}
              id={module.id}
              title={module.title}
              onMove={handleModuleMove}
              className={
                module.component === "InteractiveChartModule"
                  ? "lg:col-span-2"
                  : ""
              }
            >
              {renderModule(module)}
            </DraggableModule>
          ))}
        </div>
      </div>
    </DragDropProvider>
  );
};

export default AdminDashboard;
