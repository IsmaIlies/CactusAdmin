const LeadsSalesPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Ventes Leads</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Statistiques des Ventes</h2>
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre de Ventes</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Montant Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Exemple de données statiques */}
            <tr className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">06/08/2025</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">15</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">1500€</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">05/08/2025</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">10</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">1000€</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsSalesPage;
