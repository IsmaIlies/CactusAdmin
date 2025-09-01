import React, { useState, useEffect } from "react";
import { X, Calendar, Save } from "lucide-react";
import { ContactsArgues } from "../../services/salesService";

interface ContactsArguesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactsArgues: ContactsArgues[];
  onSave: (date: string, count: number) => Promise<void>;
  isLoading: boolean;
}

const ContactsArguesModal: React.FC<ContactsArguesModalProps> = ({
  isOpen,
  onClose,
  contactsArgues,
  onSave,
  isLoading,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [count, setCount] = useState<string>("0");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  // Sélectionne la date d'aujourd'hui par défaut
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setSelectedDate(today);

      // Vérifier si on a déjà une valeur pour cette date
      const existingEntry = contactsArgues.find((ca) => ca.date === today);
      setCount(existingEntry ? existingEntry.count.toString() : "0");
    }
  }, [isOpen, contactsArgues]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    const existingEntry = contactsArgues.find(
      (ca) => ca.date === e.target.value
    );
    setCount(existingEntry ? existingEntry.count.toString() : "0");
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // N'accepter que des nombres
    if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
      setCount(e.target.value);
    }
  };

  const handleSave = async () => {
    if (!selectedDate || count === "") return;

    setSaveStatus("saving");
    try {
      await onSave(selectedDate, parseInt(count));
      setSaveStatus("success");

      // Réinitialiser le statut après 2 secondes
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setSaveStatus("error");

      // Réinitialiser le statut après 2 secondes
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Gestion des contacts argumentés
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Calendar size={16} className="text-gray-500" />
                </div>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cactus-500 focus:border-cactus-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="count"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre de contacts argumentés
              </label>
              <input
                type="text"
                id="count"
                value={count}
                onChange={handleCountChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-cactus-500 focus:border-cactus-500"
                placeholder="0"
              />
            </div>

            {/* Historique récent */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Historique récent
              </h3>
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacts
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contactsArgues.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-center text-sm text-gray-500"
                        >
                          Aucun historique disponible
                        </td>
                      </tr>
                    ) : (
                      contactsArgues.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {entry.count}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-center">
                            <button
                              onClick={() => {
                                setSelectedDate(entry.date);
                                setCount(entry.count.toString());
                              }}
                              className="text-cactus-600 hover:text-cactus-800 text-xs font-medium"
                            >
                              Modifier
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-4 border-t gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || saveStatus === "saving"}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              saveStatus === "success"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : saveStatus === "error"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-cactus-600 hover:bg-cactus-700 text-white"
            }`}
          >
            {saveStatus === "saving" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enregistrement...
              </>
            ) : saveStatus === "success" ? (
              <>✅ Enregistré</>
            ) : saveStatus === "error" ? (
              <>❌ Erreur</>
            ) : (
              <>
                <Save size={16} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactsArguesModal;
