import React from 'react';

interface SalesFiltersProps {
  selectedOffers: string[];
  setSelectedOffers: (offers: string[]) => void;
  selectedSellers: string[];
  setSelectedSellers: (sellers: string[]) => void;
  selectedConsent: string[];
  setSelectedConsent: (consent: string[]) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  offers: { id: string; name: string }[];
  sellers: string[];
  onClearFilters: () => void;
}

const SalesFilters: React.FC<SalesFiltersProps> = ({
  selectedOffers,
  setSelectedOffers,
  selectedSellers,
  setSelectedSellers,
  selectedConsent,
  setSelectedConsent,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  offers,
  sellers,
  onClearFilters
}) => {
  const toggleOffer = (offerId: string) => {
    setSelectedOffers(
      selectedOffers.includes(offerId)
        ? selectedOffers.filter(id => id !== offerId)
        : [...selectedOffers, offerId]
    );
  };

  const toggleSeller = (seller: string) => {
    setSelectedSellers(
      selectedSellers.includes(seller)
        ? selectedSellers.filter(s => s !== seller)
        : [...selectedSellers, seller]
    );
  };

  const toggleConsent = (consent: string) => {
    setSelectedConsent(
      selectedConsent.includes(consent)
        ? selectedConsent.filter(c => c !== consent)
        : [...selectedConsent, consent]
    );
  };

  const hasActiveFilters = selectedOffers.length > 0 || selectedSellers.length > 0 || selectedConsent.length < 2 || startDate || endDate;

  const consentOptions = [
    { id: 'yes', label: 'Oui', color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 'pending', label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            <span>❌</span>
            Effacer tout
          </button>
        )}
      </div>

      {/* Filtres par période */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="mr-2">📅</span>
          Période
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
            />
          </div>
        </div>
      </div>

      {/* Filtres par offre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="mr-2">📦</span>
          Type d'offre
        </label>
        <div className="flex flex-wrap gap-2">
          {offers.map(offer => (
            <button
              key={offer.id}
              onClick={() => toggleOffer(offer.id)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                selectedOffers.includes(offer.id)
                  ? 'bg-cactus-600 text-white border-cactus-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {offer.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres par consentement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="mr-2">✅</span>
          Consentement
        </label>
        <div className="flex flex-wrap gap-2">
          {consentOptions.map(option => (
            <button
              key={option.id}
              onClick={() => toggleConsent(option.id)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                selectedConsent.includes(option.id)
                  ? `${option.bgColor} ${option.color} border-current`
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  option.id === 'yes' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></span>
                {option.label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Par défaut, seules les ventes avec consentement "Oui" sont affichées
        </p>
      </div>

      {/* Filtres par vendeur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="mr-2">👤</span>
          Télévendeurs
        </label>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {sellers.map(seller => (
            <label key={seller} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedSellers.includes(seller)}
                onChange={() => toggleSeller(seller)}
                className="rounded border-gray-300 text-cactus-600 focus:ring-cactus-500"
              />
              <span className="ml-2 text-sm text-gray-700">{seller}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalesFilters;