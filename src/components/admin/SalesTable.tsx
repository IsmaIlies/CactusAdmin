import React, { useState } from "react";

import { Sale, OrderStatus } from '../../services/salesService';

interface SalesTableProps {
  sales: Sale[];
  offers: { id: string; name: string }[];
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
}

const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  offers,
  onEdit,
  onDelete,
}) => {
  const [sortField, setSortField] = useState<"date" | "name" | "offer">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const parseDate = (date: any) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (typeof date === "string") return new Date(date);
    return null;
  };

  const getOfferName = (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    return offer ? offer.name : offerId;
  };

  const handleSort = (field: "date" | "name" | "offer") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedSales = [...sales].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case "date":
        aValue = parseDate(a.date)?.getTime() || 0;
        bValue = parseDate(b.date)?.getTime() || 0;
        break;
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "offer":
        aValue = getOfferName(a.offer).toLowerCase();
        bValue = getOfferName(b.offer).toLowerCase();
        break;
      default:
        return 0;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (field: string) => {
    if (sortField !== field) return "↕️";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              onClick={() => handleSort("date")}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Date {getSortIcon("date")}
            </th>
            <th
              onClick={() => handleSort("name")}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Vendeur {getSortIcon("name")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              N° Commande
            </th>
            <th
              onClick={() => handleSort("offer")}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Offre {getSortIcon("offer")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut commande
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prénom client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedSales.map((sale) => {
            const saleDate = parseDate(sale.date);
            return (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {saleDate ? (
                    <div>
                      <div>{saleDate.toLocaleDateString("fr-FR")}</div>
                      <div className="text-xs text-gray-500">
                        {saleDate.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : (
                    "Date invalide"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {sale.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  #{sale.orderNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getOfferName(sale.offer)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const statusLabels: Record<OrderStatus, { label: string; color: string }> = {
                      en_attente: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
                      valide: { label: "Validé", color: "bg-green-100 text-green-800" },
                      probleme_iban: { label: "Problème IBAN", color: "bg-red-100 text-red-800" },
                      roac: { label: "ROAC", color: "bg-blue-100 text-blue-800" },
                      validation_soft: { label: "Valid Soft", color: "bg-purple-100 text-purple-800" },
                    };
                    const status = sale.orderStatus as OrderStatus;
                    const { label, color } = statusLabels[status] || { label: status, color: "bg-gray-100 text-gray-800" };
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.clientLastName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.clientFirstName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.clientPhone || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(sale)}
                      className="text-cactus-600 hover:text-cactus-900 transition-colors"
                    >
                      <span>✏️</span>
                    </button>
                    <button
                      onClick={() => onDelete(sale.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sales.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Aucune vente trouvée avec les filtres actuels
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesTable;
