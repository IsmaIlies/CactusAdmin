import React from "react";
import Sidebar from "../components/Sidebar";
import AdminSalesPage from "./AdminSalesPage";
import SettingsPage from "./SettingsPage";
import MissionManagementPage from "./MissionManagementPage";
import ManagementPage from "./ManagementPage";
import ItRequestPage from "./ItRequestPage";
import AdminUsersPage from "./AdminUsersPage";

const LeadsDashboardPage = () => {
  return (
    <div className="flex h-screen bg-sand-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-auto p-6">
            {/* Indicateur de mission */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-6 rounded-lg shadow-lg mb-6 text-white">
              <h1 className="text-3xl font-extrabold">Mission Leads</h1>
              <p className="text-lg font-medium opacity-90">Statistiques et données en temps réel</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Ventes & Objectifs */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Ventes & Objectifs</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Aujourd'hui</p>
                    <p className="text-2xl font-bold text-blue-600">25</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Cette semaine</p>
                    <p className="text-2xl font-bold text-blue-600">58</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Ce mois</p>
                    <p className="text-2xl font-bold text-blue-600">86</p>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-700">Objectifs en cours</h3>
                  <p className="text-sm text-gray-500">Ventes Juillet</p>
                  <p className="text-xs text-gray-400">Période: Juillet 2025</p>
                  <p className="text-xs text-gray-400">Progression: 225 / 140 restants</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: '161%' }}></div>
                  </div>
                </div>
              </div>

              {/* Contacts argumentés & Taux de concrétisation */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Contacts argumentés & Taux de concrétisation</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total contacts argumentés</p>
                    <p className="text-2xl font-bold text-blue-600">60</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Moyenne journalière</p>
                    <p className="text-2xl font-bold text-blue-600">60</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Taux de concrétisation</p>
                    <p className="text-2xl font-bold text-blue-600">143.3%</p>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-700">Détails du mois en cours</h3>
                  <p className="text-xs text-gray-400">Jours avec activité: 1</p>
                  <p className="text-xs text-gray-400">Ventes du mois: 86</p>
                  <p className="text-xs text-gray-400">Meilleur taux: 55%</p>
                  <p className="text-xs text-gray-400">Taux le plus bas: 55%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 mt-8">
              {/* Tableau des données du formulaire */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Données du formulaire Leads</h2>
                <table className="table-auto w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Numéro DID ou DOLEAD_ID</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Type d'offre</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Intitulé de l'offre</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Référence du panier</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Fiche du jour</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Origine Leads</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Date technicien</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">12345</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">Mobile</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">Offre Jaune</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">PAN123</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">OUI</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">HIPTO</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">05/08/2025</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsDashboardPage;
