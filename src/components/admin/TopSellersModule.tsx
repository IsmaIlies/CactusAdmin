import React, { useState } from 'react';

interface Sale {
  id: string;
  date: any;
  name: string;
  userId: string;
}

interface TopSellersModuleProps {
  sales: Sale[];
}

const TopSellersModule: React.FC<TopSellersModuleProps> = ({ sales }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const parseDate = (date: any) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (typeof date === 'string') return new Date(date);
    return null;
  };

  const isInPeriod = (date: any, period: 'week' | 'month') => {
    const d = parseDate(date);
    if (!d) return false;
    const now = new Date();
    
    if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return d >= weekStart;
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= monthStart;
    }
  };

  const getTopSellers = () => {
    const filteredSales = sales.filter(sale => isInPeriod(sale.date, period));
    
    const sellerCounts: Record<string, { name: string; count: number; userId: string }> = {};
    
    filteredSales.forEach(sale => {
      const key = sale.userId || sale.name;
      if (!sellerCounts[key]) {
        sellerCounts[key] = { name: sale.name, count: 0, userId: sale.userId };
      }
      sellerCounts[key].count++;
    });

    return Object.values(sellerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const topSellers = getTopSellers();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return "🏆";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return "👤";
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-50 border-yellow-200';
      case 1:
        return 'bg-gray-50 border-gray-200';
      case 2:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Période:</h4>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
        >
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
        </select>
      </div>

      {topSellers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">🏆</div>
          <p>Aucune vente cette {period === 'week' ? 'semaine' : 'mois'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topSellers.map((seller, index) => (
            <div
              key={seller.userId || seller.name}
              className={`flex items-center justify-between p-3 rounded-lg border ${getRankBg(index)}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8">
                  <span className="text-2xl">{getRankIcon(index)}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{seller.name}</p>
                  <p className="text-sm text-gray-600">#{index + 1}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{seller.count}</p>
                <p className="text-xs text-gray-500">vente{seller.count > 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopSellersModule;