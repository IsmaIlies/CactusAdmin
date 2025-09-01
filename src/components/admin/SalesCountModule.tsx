import React from 'react';

interface SalesCountModuleProps {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
}

const SalesCountModule: React.FC<SalesCountModuleProps> = ({
  dailySales,
  weeklySales,
  monthlySales
}) => {
  const stats = [
    {
      label: "Aujourd'hui",
      value: dailySales,
      icon: "🕐",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      label: "Cette semaine",
      value: weeklySales,
      icon: "📅",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      label: "Ce mois",
      value: monthlySales,
      icon: "📈",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
          <div className={`p-3 rounded-full ${stat.bgColor} flex items-center justify-center`}>
            <span className="text-2xl">{stat.icon}</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SalesCountModule;