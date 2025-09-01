import React, { useState } from "react";
import { X, Plus, UserPlus, Mail } from "lucide-react";

interface EmailRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (recipients: string[]) => void;
  isLoading?: boolean;
}

const EmailRecipientsModal: React.FC<EmailRecipientsModalProps> = ({
  isOpen,
  onClose,
  onSend,
  isLoading = false,
}) => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  // Adresses d'ajout rapide
  const quickAddEmails = [
    "i.boultame@mars-marketing.fr",
    "m.demauret@mars-marketing.fr",
    "j.allione@mars-marketing.fr",
  ];

  const addEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email) && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipients.length > 0) {
      onSend(recipients);
    }
  };

  const handleNewEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim()) {
      addEmail(newEmail.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Sélectionner les destinataires
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Ajout rapide */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Ajout rapide
            </h4>
            <div className="space-y-2">
              {quickAddEmails.map((email) => (
                <button
                  key={email}
                  onClick={() => addEmail(email)}
                  disabled={recipients.includes(email) || isLoading}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                    recipients.includes(email)
                      ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <Mail className="h-4 w-4 inline mr-2" />
                  {email}
                  {recipients.includes(email) && " (déjà ajouté)"}
                </button>
              ))}
            </div>
          </div>

          {/* Ajout manuel */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Ajouter une adresse manuellement
            </h4>
            <form onSubmit={handleNewEmailSubmit} className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!newEmail.trim() || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Liste des destinataires sélectionnés */}
          {recipients.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Destinataires sélectionnés ({recipients.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recipients.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                  >
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => removeEmail(email)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={recipients.length === 0 || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Envoi..." : `Envoyer (${recipients.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailRecipientsModal;
