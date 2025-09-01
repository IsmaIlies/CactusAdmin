import React, { useState } from "react";
const ItRequestPage = () => {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [dateEntree, setDateEntree] = useState("");
  const [mission, setMission] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSendToAgent = async () => {
    setSending(true);
    setSuccess("");
    setError("");
    try {
      const subject = `Nouvelle demande d'ajout d'utilisateur - ${prenom} ${nom}`;
      const payload = {
        nom,
        prenom,
        date_entree: dateEntree,
        mission,
        subject
      };
      console.log("Données envoyées :", payload);

      const response = await fetch("https://eoirm99epe1afvi.m.pipedream.net", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("Statut de la réponse :", response.status);

      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      console.log("Données de la réponse :", responseData);

      if (!response.ok) throw new Error("Erreur lors de l'envoi au webhook");

      setSuccess("Demande envoyée à l'agent IA !");
      setNom("");
      setPrenom("");
      setDateEntree("");
      setMission("");
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur lors de l'envoi de la demande.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-gradient-to-r from-green-400 to-blue-500 p-10 rounded-xl shadow-2xl flex flex-col items-center justify-center">
      <h2 className="text-4xl font-extrabold mb-6 text-center text-white">Demande Téléacteur</h2>
      <p className="text-center text-white mb-8 text-lg">Remplissez les informations ci-dessous pour activer l'agent IA.</p>
      <div className="w-full space-y-6">
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-4 focus:ring-green-300 text-lg"
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          placeholder="Prénom du Téléacteur"
          required
        />
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-4 focus:ring-green-300 text-lg"
          value={nom}
          onChange={e => setNom(e.target.value)}
          placeholder="Nom du Téléacteur"
          required
        />
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-4 focus:ring-green-300 text-lg"
          type="date"
          value={dateEntree}
          onChange={e => setDateEntree(e.target.value)}
          placeholder="Date d'entrée"
          required
        />
        <select
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-4 focus:ring-green-300 text-lg"
          value={mission}
          onChange={e => setMission(e.target.value)}
          required
        >
          <option value="" disabled>Choisir la mission</option>
          <option value="Canal+">Canal +</option>
          <option value="Leads">Leads</option>
        </select>
        <button
          type="button"
          className={`w-full bg-white text-green-600 hover:bg-green-600 hover:text-white px-6 py-3 rounded-lg font-bold text-xl transition-all ${sending ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleSendToAgent}
          disabled={sending}
        >
          {sending ? "Envoi en cours..." : "Activer l’agent IA"}
        </button>
        {success && <div className="mt-4 text-green-100 bg-green-700 p-4 rounded-lg font-semibold text-center">{success}</div>}
        {error && <div className="mt-4 text-red-100 bg-red-700 p-4 rounded-lg font-semibold text-center">{error}</div>}
      </div>
    </div>
  );
};

export default ItRequestPage;
