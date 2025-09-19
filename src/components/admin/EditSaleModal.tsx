import React, { useState, useEffect } from 'react';

import { Sale, OrderStatus } from '../../services/salesService';

interface EditSaleModalProps {
  sale: Sale | null;
  offers: { id: string; name: string }[];
  onSave: (saleId: string, updatedData: Partial<Sale>) => void;
  onClose: () => void;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  offers,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    orderNumber: '',
    offer: '',
    orderStatus: 'en_attente' as OrderStatus,
    date: '',
    clientFirstName: '',
    clientLastName: '',
    clientPhone: ''
  });

  useEffect(() => {
    if (sale) {
      setFormData({
        orderNumber: sale.orderNumber,
        offer: sale.offer,
        orderStatus: sale.orderStatus as OrderStatus,
        date: sale.date ? (typeof sale.date === 'string' ? sale.date.split('T')[0] : new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date).toISOString().split('T')[0]) : '',
        clientFirstName: sale.clientFirstName || '',
        clientLastName: sale.clientLastName || '',
        clientPhone: sale.clientPhone || ''
      });
    }
  }, [sale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sale) {
  onSave(sale.id, formData);
    }
  };

  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Modifier la vente
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-xl">❌</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de commande
            </label>
            <input
              type="text"
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de la vente
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom client</label>
              <input
                type="text"
                value={formData.clientFirstName}
                onChange={(e) => setFormData({ ...formData, clientFirstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom client</label>
              <input
                type="text"
                value={formData.clientLastName}
                onChange={(e) => setFormData({ ...formData, clientLastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                placeholder="Nom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone client</label>
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                placeholder="Ex: 0612345678"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Offre
            </label>
            <select
              value={formData.offer}
              onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
              required
            >
              {offers.map(offer => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut commande
            </label>
            <div className="space-y-2">
              {[
                { value: 'en_attente', label: 'En attente' },
                { value: 'valide', label: 'Validé' },
                { value: 'probleme_iban', label: 'Problème IBAN' },
                { value: 'roac', label: 'ROAC' },
                { value: 'validation_soft', label: 'Valid Soft' },
              ].map((status) => (
                <label key={status.value} className="flex items-center">
                  <input
                    type="radio"
                    name="orderStatus"
                    value={status.value}
                    checked={formData.orderStatus === status.value}
                    onChange={(e) => setFormData({ ...formData, orderStatus: e.target.value as OrderStatus })}
                    className="text-cactus-600 focus:ring-cactus-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-cactus-600 text-white rounded-md hover:bg-cactus-700 transition-colors"
            >
              <span>💾</span>
              Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSaleModal;