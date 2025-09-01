import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, Clock } from 'lucide-react';
import objectiveService, { Objective } from '../../services/objectiveService';
import salesService from '../../services/salesService';

interface VentesObjectifsModuleProps {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
}

const VentesObjectifsModule: React.FC<VentesObjectifsModuleProps> = ({
  dailySales,
  weeklySales,
  monthlySales
}) => {
  const [objectiveStats, setObjectiveStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    objectiveService.getObjectives()
      .then(async (objectives) => {
        // Filtrer uniquement les objectifs d'équipe actifs
        const activeTeamObjectives = objectives.filter(obj => obj.isActive && obj.scope === 'team');
        // Calculer les stats pour chaque objectif d'équipe
        const stats = await Promise.all(
          activeTeamObjectives.map(async (objective) => {
            let periodData: any = {};
            if (objective.period === 'month') {
              periodData = {
                year: objective.year,
                month: objective.month
              };
            } else if (objective.period === 'week') {
              periodData = {
                weekYear: objective.weekYear,
                weekNumber: objective.weekNumber,
                monthFilter: new Date().getMonth() + 1
              };
            } else if (objective.period === 'day') {
              periodData = {
                dayYear: objective.dayYear,
                dayMonth: objective.dayMonth,
                dayDate: objective.dayDate
              };
            }
            const salesCount = await salesService.getSalesCountForPeriod(objective.period, periodData);
            const progress = objective.target > 0 ? Math.round((salesCount / objective.target) * 100) : 0;
            const remainingDays = objectiveService.calculateRemainingDays(objective);
            return {
              ...objective,
              salesCount,
              progress,
              remainingDays
            };
          })
        );
        setObjectiveStats(stats);
      })
      .catch((error) => {
        console.error('Erreur lors du calcul des stats d\'objectifs:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  const salesStats = [
    {
      label: "Aujourd'hui",
      value: dailySales,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      label: "Cette semaine",
      value: weeklySales,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      label: "Ce mois",
      value: monthlySales,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "text-green-600 bg-green-100";
    if (progress >= 75) return "text-yellow-600 bg-yellow-100";
    if (progress >= 50) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const formatObjectivePeriod = (objective: Objective) => {
    return objectiveService.formatObjectivePeriod(objective);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Ventes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Ventes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {salesStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className={`p-3 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                  <IconComponent className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Objectifs en cours */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Objectifs en cours
        </h3>
        
        {objectiveStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Aucun objectif en cours</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {objectiveStats.map((objective) => (
              <div key={objective.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 truncate">{objective.label}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getProgressColor(objective.progress)}`}>
                    {objective.progress}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Période: {formatObjectivePeriod(objective)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progression: {objective.salesCount} / {objective.target}</span>
                    <span>{objective.remainingDays} jours restants</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        objective.progress >= 100 ? 'bg-green-500' :
                        objective.progress >= 75 ? 'bg-yellow-500' :
                        objective.progress >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(objective.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VentesObjectifsModule;
