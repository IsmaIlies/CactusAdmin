import React from 'react';

interface Sale {
  id: string;
  date: any;
  offer: string;
  name: string;
  orderNumber: string;
}

interface RecentSalesModuleProps {
  sales: Sale[];
  offers: { id: string; name: string }[];
}

const RecentSalesModule: React.FC<RecentSalesModuleProps> = ({ sales, offers }) => {
  const parseDate = (date: any) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (typeof date === 'string') return new Date(date);
    return null;
  };

  const isToday = (date: any) => {
    const d = parseDate(date);
    if (!d) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const todaySales = sales.filter(sale => isToday(sale.date)).slice(0, 10);

  const getOfferName = (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    return offer ? offer.name : offerId;
  };

  return (
    <div className="space-y-4">
      {todaySales.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">🕐</div>
          <p>Aucune vente aujourd'hui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaySales.map((sale) => {
            const saleDate = parseDate(sale.date);
            return (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cactus-100 rounded-full">
                    <span className="text-lg">📦</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getOfferName(sale.offer)}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>👤</span>
                      <span>{sale.name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">#{sale.orderNumber}</p>
                  <p className="text-xs text-gray-500">
                    {saleDate ? saleDate.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentSalesModule;