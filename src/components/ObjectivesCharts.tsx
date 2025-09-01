import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area
} from "recharts";

// Dummy data for illustration, replace with real props
const salesEvolutionData = [
  { date: "01/07", sales: 10 },
  { date: "02/07", sales: 15 },
  { date: "03/07", sales: 8 },
  { date: "04/07", sales: 20 },
  { date: "05/07", sales: 12 },
  { date: "06/07", sales: 18 },
  { date: "07/07", sales: 25 },
];

const objectivesProgressData = [
  { name: "Obj. 1", progress: 80 },
  { name: "Obj. 2", progress: 45 },
  { name: "Obj. 3", progress: 100 },
  { name: "Obj. 4", progress: 60 },
];

const salesByUserData = [
  { name: "Alice", value: 30 },
  { name: "Bob", value: 20 },
  { name: "Charlie", value: 10 },
  { name: "Diane", value: 40 },
];

const objectivesStatusData = [
  { name: "Atteints", value: 3 },
  { name: "En cours", value: 2 },
  { name: "Non atteints", value: 1 },
];

const projectionData = [
  { date: "01/07", sales: 10, projection: 12 },
  { date: "02/07", sales: 15, projection: 16 },
  { date: "03/07", sales: 8, projection: 10 },
  { date: "04/07", sales: 20, projection: 22 },
  { date: "05/07", sales: 12, projection: 14 },
  { date: "06/07", sales: 18, projection: 20 },
  { date: "07/07", sales: 25, projection: 28 },
];

const comparisonData = [
  { name: "Obj. 1", current: 80, previous: 60 },
  { name: "Obj. 2", current: 45, previous: 50 },
  { name: "Obj. 3", current: 100, previous: 90 },
  { name: "Obj. 4", current: 60, previous: 70 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const chartOptions = [
  { key: "line", label: "Évolution des ventes" },
  { key: "bar", label: "Progression par objectif" },
  { key: "pie", label: "Répartition par utilisateur" },
  { key: "donut", label: "Objectifs atteints vs non atteints" },
  { key: "area", label: "Projection de fin de période" },
  { key: "grouped", label: "Comparaison avec période précédente" },
];

const ObjectivesCharts: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<string>("line");

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {chartOptions.map((opt) => (
          <button
            key={opt.key}
            className={`px-3 py-1 rounded border ${selectedChart === opt.key ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
            onClick={() => setSelectedChart(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ width: "100%", height: 300 }}>
        {selectedChart === "line" && (
          <ResponsiveContainer>
            <LineChart data={salesEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Ventes" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {selectedChart === "bar" && (
          <ResponsiveContainer>
            <BarChart data={objectivesProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="progress" fill="#82ca9d" name="Progression (%)" />
            </BarChart>
          </ResponsiveContainer>
        )}
        {selectedChart === "pie" && (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={salesByUserData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {salesByUserData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        {selectedChart === "donut" && (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={objectivesStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                fill="#00C49F"
                label
              >
                {objectivesStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        {selectedChart === "area" && (
          <ResponsiveContainer>
            <AreaChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="sales" stroke="#8884d8" fill="#8884d8" name="Ventes" />
              <Area type="monotone" dataKey="projection" stroke="#82ca9d" fill="#82ca9d" name="Projection" />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {selectedChart === "grouped" && (
          <ResponsiveContainer>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#8884d8" name="Actuel" />
              <Bar dataKey="previous" fill="#82ca9d" name="Précédent" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ObjectivesCharts;
