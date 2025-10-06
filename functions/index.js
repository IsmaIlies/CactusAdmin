
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// Email sending helpers: now provider-agnostic (Sweego primary, Resend fallback)

// --- Envoi feuille de présence (TA) ---
exports.sendAttendanceEmail = onCall({ region: "europe-west9" }, async (request) => {
  const { date, present, absent, html, recipients } = request.data || {};

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }
  if (!date || !html) {
    throw new HttpsError("invalid-argument", "Date et contenu requis");
  }

  const functions = require('firebase-functions');
  const cfg = functions.config ? functions.config() : {};
  const subject = `Feuille de présence TA - ${date}`;
  const defaultRecipients = (process.env.ATTENDANCE_RECIPIENTS || cfg.attendance?.recipients || "i.boultame@mars-marketing.fr,i.brai@mars-marketing.fr")
    .split(/[,;\s]+/)
    .filter(Boolean);
  const finalRecipients = Array.isArray(recipients) && recipients.length ? recipients : defaultRecipients;

  try {
    const { provider, meta } = await sendEmailUnified({ recipients: finalRecipients, subject, html });
    return { success: true, provider, recipients: finalRecipients, meta };
  } catch (e) {
    console.error('[sendAttendanceEmail] error final', e);
    if (e instanceof HttpsError) throw e;
    // Erreur enrichie custom
    if (e && e.code === 'EMAIL_SEND_FAILED') {
      const status = e.status; const snippet = e.snippet; const prov = e.providerTried;
      if (status === 401 || status === 403) throw new HttpsError('failed-precondition', `Provider ${prov} non autorisé (${status})`, { status, snippet });
      if (status === 400) throw new HttpsError('invalid-argument', `Payload refusé (${prov})`, { status, snippet });
      throw new HttpsError('internal', `Echec envoi (${prov})`, { status, snippet });
    }
    throw new HttpsError('internal', e.message || 'Erreur envoi présence');
  }
});

exports.sendItRequestMail = onCall({ region: "europe-west9" }, async (request) => {
  const { prenom, nom } = request.data;
  if (!prenom || !nom) throw new HttpsError("invalid-argument", "Prénom et nom requis");
  const functions = require('firebase-functions');
  const cfg = functions.config ? functions.config() : {};
  // Pas d'obligation Sweego maintenant : on bascule sur envoi unifié
  const subject = "Demande de création d’adresse email pour un nouveau Téléacteur";
  const emailBody = `Bonjour,\n\nMerci de bien vouloir créer une adresse email professionnelle pour le nouveau Téléacteur :\n\nPrénom Nom : ${prenom} ${nom}\nAdresse proposée : ${prenom.toLowerCase()}.${nom.toLowerCase()}@mars-marketing.com\n\nMerci d’avance.\nService IT`;
  const html = `<p>Bonjour,</p><p>Merci de créer une adresse email pour le nouveau Téléacteur :</p><ul><li><strong>Prénom Nom</strong> : ${prenom} ${nom}</li><li><strong>Adresse proposée</strong> : ${prenom.toLowerCase()}.${nom.toLowerCase()}@mars-marketing.com</li></ul><p>Merci d'avance.<br/>Service IT</p>`;
  const recipients = ["i.boultame@mars-marketing.fr","i.brai@mars-marketing.fr"]; 
  try {
    await sendEmailUnified({ recipients, subject, html });
    return { success: true };
  } catch (e) {
    console.error('sendItRequestMail error', e);
    throw new HttpsError('internal', e.message || 'Erreur envoi demande IT');
  }
});

// Fonction pour envoyer une demande de création d'email à l'IT

// ...existing code...

// Fonction pour lister tous les utilisateurs (admin seulement)
exports.listUsers = onCall({ region: "europe-west9" }, async (request) => {
  // Vérifier que l'utilisateur est authentifié et est admin
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }

  const userRecord = await admin.auth().getUser(request.auth.uid);
  if (!userRecord.customClaims || !userRecord.customClaims.admin) {
    throw new HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent lister les utilisateurs"
    );
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const db = admin.firestore();

    // Récupérer les informations supplémentaires depuis Firestore
    const usersWithExtraInfo = await Promise.all(
      listUsersResult.users.map(async (user) => {
        let extraInfo = {};
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          if (userDoc.exists) {
            extraInfo = userDoc.data();
          }
        } catch (error) {
          console.log(
            `Erreur lors de la récupération des infos pour ${user.uid}:`,
            error
          );
        }

        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          role: user.customClaims?.role || "user",
          customClaims: user.customClaims || {},
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime,
          firstName: extraInfo.firstName || "",
          lastName: extraInfo.lastName || "",
        };
      })
    );

    return { users: usersWithExtraInfo, success: true };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.forceLogoutUser = onCall({ region: "europe-west9" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }

  const requester = await admin.auth().getUser(request.auth.uid);
  const isAdmin = requester.customClaims && requester.customClaims.admin;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Seuls les administrateurs peuvent forcer une déconnexion");
  }

  const targetUserId = request.data && request.data.userId;
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new HttpsError("invalid-argument", "Identifiant utilisateur requis");
  }

  try {
    await admin.auth().revokeRefreshTokens(targetUserId);
    return { success: true };
  } catch (error) {
    console.error("Erreur forceLogoutUser", error);
    throw new HttpsError("internal", error.message || "Impossible de forcer la déconnexion");
  }
});

// Soumission d'heures depuis le site Agent (autre app)
// Usage côté client (autre site) via Firebase Functions SDK:
//   const submit = httpsCallable(functions, 'submitAgentHours');
//   await submit({ day, includeMorning, includeAfternoon, morningStart, morningEnd, afternoonStart, afternoonEnd, project, notes, hasDispute });
exports.submitAgentHours = onCall({ region: "europe-west9" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }
  const uid = request.auth.uid;
  const data = request.data || {};

  // Validation minimale
  const required = [
    "day",
    "includeMorning",
    "includeAfternoon",
    "morningStart",
    "morningEnd",
    "afternoonStart",
    "afternoonEnd",
    "project",
  ];
  for (const k of required) {
    if (typeof data[k] === "undefined") {
      throw new HttpsError("invalid-argument", `Champ manquant: ${k}`);
    }
  }

  const day = String(data.day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new HttpsError("invalid-argument", "Format de date attendu yyyy-mm-dd");
  }

  const period = day.slice(0, 7); // yyyy-MM

  const entry = {
    id: day,
    period,
    day,
    includeMorning: !!data.includeMorning,
    includeAfternoon: !!data.includeAfternoon,
    morningStart: String(data.morningStart || ""),
    morningEnd: String(data.morningEnd || ""),
    afternoonStart: String(data.afternoonStart || ""),
    afternoonEnd: String(data.afternoonEnd || ""),
    project: String(data.project || "Autre"),
    notes: data.notes ? String(data.notes) : undefined,
    status: "submitted",
    reviewStatus: "Pending",
    hasDispute: !!data.hasDispute,
    userId: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const db = admin.firestore();
    const deterministicId = `${uid}_${day}`;
    await db.collection("hoursEntries").doc(deterministicId).set(entry, { merge: true });
    return { success: true, id: deterministicId };
  } catch (e) {
    console.error("submitAgentHours error", e);
    throw new HttpsError("internal", e.message || "Erreur enregistrement des heures");
  }
});

// Fonction pour définir le rôle d'un utilisateur (admin seulement)
exports.setUserRole = onCall({ region: "europe-west9" }, async (request) => {
  const { targetUserId, role } = request.data;

  // Vérifier que l'utilisateur est authentifié et est admin
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }

  const userRecord = await admin.auth().getUser(request.auth.uid);
  if (!userRecord.customClaims || !userRecord.customClaims.admin) {
    throw new HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent modifier les rôles"
    );
  }

  if (!targetUserId || !role) {
    throw new HttpsError(
      "invalid-argument",
      "L'ID utilisateur et le rôle sont requis"
    );
  }

  const validRoles = ["admin", "direction", "superviseur", "ta", "user"];
  if (!validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", "Rôle invalide");
  }

  try {
    const targetRecord = await admin.auth().getUser(targetUserId);
    const existingClaims = targetRecord.customClaims || {};
    const roleClaimsToClear = ["admin", "direction", "superviseur", "ta"];

    const newClaims = { ...existingClaims };

    delete newClaims.role;
    roleClaimsToClear.forEach((key) => {
      if (newClaims[key]) {
        delete newClaims[key];
      }
    });

    if (role !== "user") {
      newClaims.role = role;
      newClaims[role] = true;
    }

    await admin.auth().setCustomUserClaims(targetUserId, newClaims);

    return {
      success: true,
      message: `Rôle ${role} assigné avec succès`,
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// Fonction pour envoyer le récapitulatif par email
exports.sendSalesRecap = onCall({ region: "europe-west9" }, async (request) => {
  const { salesData, contactsArgues, period, recipients } = request.data;

  // Vérifier que l'utilisateur est authentifié
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }

  if (!salesData || !Array.isArray(salesData)) {
    throw new HttpsError("invalid-argument", "Données de ventes invalides");
  }

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Au moins un destinataire est requis"
    );
  }

  // Valider les adresses email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of recipients) {
    if (!emailRegex.test(email)) {
      throw new HttpsError(
        "invalid-argument",
        `Adresse email invalide: ${email}`
      );
    }
  }

  try {
    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const subject = `Récapitulatif Canal - ${today}`;
    const html = buildRecapHtml(salesData, contactsArgues, period, today);
    console.log('[sendSalesRecap] start', { recipients: recipients.length, htmlSize: html.length, subject });
  const { provider, meta } = await sendEmailUnified({ recipients, subject, html });
  console.log('[sendSalesRecap] done', { recipients: recipients.length, provider });
  return { success: true, provider, meta, message: `Récapitulatif envoyé (${recipients.length} destinataires)` };
  } catch (error) {
    console.error('[sendSalesRecap] error', error.status, error.snippet);
    if (error.isAxiosError) {
      const status = error.status;
      if (status === 401 || status === 403) {
        throw new HttpsError('failed-precondition', 'Clé / domaine Sweego non autorisé', { status, snippet: error.snippet });
      }
      if (status === 400) {
        throw new HttpsError('invalid-argument', 'Payload refusé par Sweego', { status, snippet: error.snippet });
      }
      throw new HttpsError('internal', `Erreur Sweego (${status || '??'})`, { status, snippet: error.snippet });
    }
    throw new HttpsError('internal', error.message || 'Erreur envoi récapitulatif');
  }
});

// Fonction pour envoyer le rapport hebdomadaire
exports.sendWeeklyReport = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { salesData, contactsArguesData, startDate, endDate, recipients } =
      request.data;

    // Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
    }

    if (!salesData || !Array.isArray(salesData)) {
      throw new HttpsError("invalid-argument", "Données de ventes invalides");
    }

    if (!contactsArguesData || !Array.isArray(contactsArguesData)) {
      throw new HttpsError(
        "invalid-argument",
        "Données de contacts argumentés invalides"
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Au moins un destinataire est requis"
      );
    }

    // Valider les adresses email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new HttpsError(
          "invalid-argument",
          `Adresse email invalide: ${email}`
        );
      }
    }

    try {
      const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const monthName = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const subject = `Rapport mensuel Canal+ - ${monthName}`;
      const html = buildWeeklyReportHtml(salesData, contactsArguesData, startDate, endDate, today);
      console.log('[sendWeeklyReport] start', { recipients: recipients.length, htmlSize: html.length, subject });
  const { provider, meta } = await sendEmailUnified({ recipients, subject, html });
  console.log('[sendWeeklyReport] done', { recipients: recipients.length, provider });
  return { success: true, provider, meta, message: `Rapport mensuel envoyé (${recipients.length} destinataires)` };
    } catch (error) {
      console.error('[sendWeeklyReport] error', error.status, error.snippet);
      if (error.isAxiosError) {
        const status = error.status;
        if (status === 401 || status === 403) {
          throw new HttpsError('failed-precondition', 'Clé / domaine Sweego non autorisé', { status, snippet: error.snippet });
        }
        if (status === 400) {
          throw new HttpsError('invalid-argument', 'Payload refusé par Sweego', { status, snippet: error.snippet });
        }
        throw new HttpsError('internal', `Erreur Sweego (${status || '??'})`, { status, snippet: error.snippet });
      }
      throw new HttpsError('internal', error.message || 'Erreur envoi rapport mensuel');
    }
  }
);

// generateImages supprimée: utilisation d'un lien externe Craiyon directement

function buildRecapHtml(salesData, contactsArgues, period, today) {
  const contactsNumber = parseInt(contactsArgues) || 0;
  const salesWithConsent = salesData.filter(
    (sale) => sale.consent === "yes"
  ).length;
  const conversionRate =
    contactsNumber > 0
      ? ((salesData.length / contactsNumber) * 100).toFixed(1)
      : "0";

  // Calculer les ventes par vendeur
  const salesByVendor = {};
  salesData.forEach((sale) => {
    salesByVendor[sale.name] = (salesByVendor[sale.name] || 0) + 1;
  });

  // Trier les vendeurs par nombre de ventes (décroissant)
  const sortedVendors = Object.entries(salesByVendor).sort(
    ([, a], [, b]) => b - a
  );

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Récapitulatif des ventes Canal</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" style="background-color:#ffffff; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.05); overflow:hidden;">
          <tr>
            <td style="background: #000000; padding:30px; text-align:center; color:#ffffff;">
              <div style="margin-bottom: 20px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Logo_Canal%2B_1995.svg/1200px-Logo_Canal%2B_1995.svg.png" alt="Canal+" style="height: 40px; width: auto;" />
              </div>
              <h1 style="margin:0; font-size:24px;">📊 Récapitulatif des Ventes</h1>
              <div style="background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 15px; font-size: 14px; margin-top: 10px; display: inline-block;">
                ${period || "Période non spécifiée"}
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; font-size: 14px;">
                Mission CANAL
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px; font-size:16px; color:#333;">
              <!-- Statistiques -->
              <table width="100%" style="border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="width:33%; text-align:center; padding:15px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px;">
                    <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${
                      salesData.length
                    }</div>
                    <div style="font-size:12px; color:#666; text-transform:uppercase; letter-spacing:0.5px;">Ventes Canal+</div>
                  </td>
                  <td style="width:33%; text-align:center; padding:15px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; margin:0 10px;">
                    <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${contactsNumber}</div>
                    <div style="font-size:12px; color:#666; text-transform:uppercase; letter-spacing:0.5px;">Contacts argumentés</div>
                  </td>
                  <td style="width:33%; text-align:center; padding:15px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px;">
                    <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${conversionRate}%</div>
                    <div style="font-size:12px; color:#666; text-transform:uppercase; letter-spacing:0.5px;">Taux de concrétisation</div>
                  </td>
                </tr>
              </table>

              <!-- Performance par vendeur -->
              <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #000000; margin-bottom: 15px;">🏆 Performance par télévendeur</h2>
                ${
                  sortedVendors.length > 0
                    ? sortedVendors
                        .map(
                          ([name, count], index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                      <span style="font-weight: 500;">
                        ${
                          index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : "👤"
                        } 
                        ${name}
                      </span>
                      <span style="background: #000000; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px;">${count}</span>
                    </div>
                  `
                        )
                        .join("")
                    : '<p style="text-align: center; color: #666;">Aucune vente Canal+ enregistrée</p>'
                }
              </div>

              <div style="text-align:center; margin:30px 0;">
                <a href="https://cactus-tech.fr" target="_blank" style="background-color:#00c08b; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:5px; font-size:16px;">Accéder à Cactus-Tech</a>
              </div>
              <p style="font-size:14px; color:#999;">L'équipe Cactus-Tech 🌵</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#e0e0e0; padding:15px; text-align:center; font-size:12px; color:#666;">
              📈 Rapport généré automatiquement par Cactus - Plateforme de gestion des ventes Canal+ - ${today}
              <br>
              <a href="mailto:support@cactus-tech.fr" style="color:#007b5f; text-decoration:underline;">Contact support</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWeeklyReportHtml(
  salesData,
  contactsArguesData,
  startDate,
  endDate,
  today
) {
  // Utiliser la date actuelle pour l'affichage du mois (indépendamment des données reçues)
  const currentDate = new Date();
  const displayMonth = currentDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Validation et parsing sécurisé des dates
  let start, end;
  try {
    start = new Date(startDate + "T00:00:00");
    end = new Date(endDate + "T23:59:59");

    // Vérifier que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format");
    }
  } catch (error) {
    console.error("Erreur de parsing des dates:", error);
    // Dates par défaut en cas d'erreur
    start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }

  // Analyser les données par jour (seulement les jours passés)
  const dailyData = [];
  const currentDay = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Créer un objet pour les contacts argumentés par date
  const contactsArguesByDate = {};
  if (Array.isArray(contactsArguesData)) {
    // Filtrer les contacts argumentés pour ne garder que le mois en cours
    const filteredContactsArgues = contactsArguesData.filter((ca) => {
      try {
        const caDate = new Date(ca.date + "T12:00:00");
        return (
          caDate.getMonth() === currentMonth &&
          caDate.getFullYear() === currentYear
        );
      } catch (error) {
        return false;
      }
    });

    filteredContactsArgues.forEach((ca) => {
      contactsArguesByDate[ca.date] = ca.count;
    });
  }

  // Filtrer les ventes pour ne garder que le mois en cours
  const filteredSalesData = Array.isArray(salesData)
    ? salesData.filter((sale) => {
        try {
          let saleDate;

          // Gérer différents formats de date
          if (sale.date && typeof sale.date === "object" && sale.date.toDate) {
            saleDate = sale.date.toDate();
          } else if (
            sale.date &&
            typeof sale.date === "object" &&
            sale.date.seconds
          ) {
            saleDate = new Date(sale.date.seconds * 1000);
          } else {
            saleDate = new Date(sale.date);
          }

          if (isNaN(saleDate.getTime())) return false;

          return (
            saleDate.getMonth() === currentMonth &&
            saleDate.getFullYear() === currentYear
          );
        } catch (error) {
          return false;
        }
      })
    : [];

  // Analyser chaque jour du mois jusqu'à aujourd'hui
  for (
    let date = new Date(currentYear, currentMonth, 1);
    date <= currentDate && date.getMonth() === currentMonth;
    date.setDate(date.getDate() + 1)
  ) {
    const dateStr = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });

    // Compter les ventes pour ce jour en utilisant les données déjà filtrées
    const daySales = filteredSalesData.filter((sale) => {
      try {
        let saleDate;

        // Gérer différents formats de date
        if (sale.date && typeof sale.date === "object" && sale.date.toDate) {
          saleDate = sale.date.toDate();
        } else if (
          sale.date &&
          typeof sale.date === "object" &&
          sale.date.seconds
        ) {
          saleDate = new Date(sale.date.seconds * 1000);
        } else {
          saleDate = new Date(sale.date);
        }

        if (isNaN(saleDate.getTime())) {
          return false;
        }

        const saleDateStr = saleDate.toISOString().split("T")[0];
        return saleDateStr === dateStr;
      } catch (error) {
        console.error(
          "Erreur de parsing de la date de vente:",
          sale.date,
          error
        );
        return false;
      }
    });

    const salesCount = daySales.length;
    const contactsCount = contactsArguesByDate[dateStr] || 0;
    const conversionRate =
      contactsCount > 0 ? ((salesCount / contactsCount) * 100).toFixed(1) : "0";

    dailyData.push({
      date: dateStr,
      dayName,
      salesCount,
      contactsCount,
      conversionRate: parseFloat(conversionRate),
    });
  }

  // Calculer les moyennes
  const totalSales = dailyData.reduce((sum, day) => sum + day.salesCount, 0);
  const totalContacts = dailyData.reduce(
    (sum, day) => sum + day.contactsCount,
    0
  );
  const averageSales =
    dailyData.length > 0 ? (totalSales / dailyData.length).toFixed(1) : "0";
  const averageContacts =
    dailyData.length > 0 ? (totalContacts / dailyData.length).toFixed(1) : "0";
  const averageConversionRate =
    totalContacts > 0 ? ((totalSales / totalContacts) * 100).toFixed(1) : "0";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport mensuel Canal+</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="700" style="background-color:#ffffff; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.05); overflow:hidden;">
          <tr>
            <td style="background: #000000; padding:30px; text-align:center; color:#ffffff;">
              <div style="margin-bottom: 20px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Logo_Canal%2B_1995.svg/1200px-Logo_Canal%2B_1995.svg.png" alt="Canal+" style="height: 40px; width: auto;" />
              </div>
              <h1 style="margin:0; font-size:28px;">📊 Rapport du mois en cours</h1>
              <div style="background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; font-size: 16px; margin-top: 15px; display: inline-block;">
                ${new Date().toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px; font-size:16px; color:#333;">
              
              <!-- Statistiques globales -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h2 style="color: #000000; margin-bottom: 20px; text-align: center;">📈 Résumé du mois</h2>
                <table width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td style="width:25%; text-align:center; padding:15px; background:#ffffff; border:1px solid #e9ecef; border-radius:8px; margin:5px;">
                      <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${totalSales}</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Total ventes</div>
                    </td>
                    <td style="width:25%; text-align:center; padding:15px; background:#ffffff; border:1px solid #e9ecef; border-radius:8px; margin:5px;">
                      <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${totalContacts}</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Total contacts</div>
                    </td>
                    <td style="width:25%; text-align:center; padding:15px; background:#ffffff; border:1px solid #e9ecef; border-radius:8px; margin:5px;">
                      <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${averageConversionRate}%</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Taux global</div>
                    </td>
                    <td style="width:25%; text-align:center; padding:15px; background:#ffffff; border:1px solid #e9ecef; border-radius:8px; margin:5px;">
                      <div style="font-size:2em; font-weight:bold; color:#000000; margin-bottom:5px;">${
                        dailyData.length
                      }</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Jours analysés</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Moyennes journalières -->
              <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h2 style="color: #000000; margin-bottom: 20px;">📊 Moyennes journalières</h2>
                <table width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td style="width:33%; text-align:center; padding:15px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px;">
                      <div style="font-size:1.5em; font-weight:bold; color:#000000; margin-bottom:5px;">${averageSales}</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Ventes/jour</div>
                    </td>
                    <td style="width:33%; text-align:center; padding:15px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; margin:0 10px;">
                      <div style="font-size:1.5em; font-weight:bold; color:#000000; margin-bottom:5px;">${averageContacts}</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Contacts/jour</div>
                    </td>
                    <td style="width:33%; text-align:center; padding:15px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px;">
                      <div style="font-size:1.5em; font-weight:bold; color:#000000; margin-bottom:5px;">${averageConversionRate}%</div>
                      <div style="font-size:12px; color:#666; text-transform:uppercase;">Taux moyen</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Détail par jour -->
              <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h2 style="color: #000000; margin-bottom: 20px;">📅 Détail journalier</h2>
                <table width="100%" style="border-collapse: collapse;">
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: left; font-weight: bold; color: #000000;">Date</th>
                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #000000;">Ventes</th>
                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #000000;">Contacts</th>
                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #000000;">Taux</th>
                  </tr>
                  ${dailyData
                    .map(
                      (day, index) => `
                    <tr style="background: ${
                      index % 2 === 0 ? "#ffffff" : "#f8f9fa"
                    };">
                      <td style="padding: 10px; border: 1px solid #e9ecef; color: #333;">
                        ${day.dayName} ${new Date(
                        day.date + "T00:00:00"
                      ).toLocaleDateString("fr-FR")}
                      </td>
                      <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #000000;">
                        ${day.salesCount}
                      </td>
                      <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #000000;">
                        ${day.contactsCount}
                      </td>
                      <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center; font-weight: bold; color: ${
                        day.conversionRate > parseFloat(averageConversionRate)
                          ? "#28a745"
                          : "#dc3545"
                      };">
                        ${day.conversionRate.toFixed(1)}%
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </table>
              </div>

              <div style="text-align:center; margin:30px 0;">
                <a href="https://cactus-tech.fr" target="_blank" style="background-color:#00c08b; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:5px; font-size:16px;">Accéder à Cactus-Tech</a>
              </div>
              <p style="font-size:14px; color:#999;">L'équipe Cactus-Tech 🌵</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#e0e0e0; padding:15px; text-align:center; font-size:12px; color:#666;">
              📊 Rapport mensuel généré automatiquement par Cactus - Plateforme de gestion des ventes Canal+ - ${today}
              <br>
              <a href="mailto:support@cactus-tech.fr" style="color:#007b5f; text-decoration:underline;">Contact support</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail({ to, subject, html }) {
  const functions = require('firebase-functions');
  const cfg = functions.config ? functions.config() : {};
  const apiKey = process.env.SWEEGO_API_KEY || cfg.sweego?.apikey || cfg.sweego?.api_key; // priorité apikey
  if (!apiKey) {
    throw new Error('SWEEGO_API_KEY manquante (config sweego.api_key ou sweego.apikey)');
  }
  const fromEmail = process.env.SWEEGO_SENDER || cfg.sweego?.sender || 'no-reply@cactus-tech.fr';
  const fromName = process.env.SWEEGO_SENDER_NAME || cfg.sweego?.sender_name || 'Cactus-Tech';

  const data = {
    channel: "email",
    provider: "sweego",
    recipients: [{ email: to }],
    from: { email: fromEmail, name: fromName },
    subject,
    "message-html": html,
  };

  try {
    const response = await axios.post("https://api.sweego.io/send", data, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Api-Key": apiKey,
      },
      timeout: 10000,
    });
    console.log(`✅ Email envoyé à ${to}:`, response.data);
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    let snippet = typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body || {}).slice(0, 300);
    console.error(`❌ Échec envoi email à ${to} (status=${status}):`, snippet);
    // enrichir l'erreur
    const enriched = new Error(err.message || 'Erreur Sweego');
    enriched.status = status;
    enriched.snippet = snippet;
    enriched.isAxiosError = true;
    enriched.raw = body;
    throw enriched;
  }
}

async function sendEmailToMultiple({ recipients, subject, html }) {
  const functions = require('firebase-functions');
  const cfg = functions.config ? functions.config() : {};
  const apiKey = process.env.SWEEGO_API_KEY || cfg.sweego?.apikey || cfg.sweego?.api_key; // priorité apikey
  if (!apiKey) {
    throw new Error('SWEEGO_API_KEY manquante (config sweego.api_key ou sweego.apikey)');
  }
  const fromEmail = process.env.SWEEGO_SENDER || cfg.sweego?.sender || 'no-reply@cactus-tech.fr';
  const fromName = process.env.SWEEGO_SENDER_NAME || cfg.sweego?.sender_name || 'Cactus-Tech';

  // Valider les adresses email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of recipients) {
    if (!emailRegex.test(email)) {
      throw new Error(`Adresse email invalide: ${email}`);
    }
  }

  const recipientList = recipients.map((email) => ({ email }));

  const data = {
    channel: "email",
    provider: "sweego",
    recipients: recipientList,
    from: { email: fromEmail, name: fromName },
    subject,
    "message-html": html,
  };

  try {
    const response = await axios.post("https://api.sweego.io/send", data, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Api-Key": apiKey,
      },
      timeout: 10000,
    });
    console.log(`✅ Email multi envoyé (${recipients.length} dest): status=${response.status}`);
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    let snippet = typeof body === 'string' ? body.slice(0,300) : JSON.stringify(body || {}).slice(0,300);
    console.error(`❌ Échec multi (status=${status}) dest=${recipients.join(', ')} :: ${snippet}`);
    const enriched = new Error(err.message || 'Erreur Sweego multi');
    enriched.status = status;
    enriched.snippet = snippet;
    enriched.isAxiosError = true;
    enriched.raw = body;
    throw enriched;
  }
}

// --- Unified provider helper (Sweego -> Resend fallback) ---
async function sendEmailUnified({ recipients, subject, html }) {
  const functions = require('firebase-functions');
  const cfg = functions.config ? functions.config() : {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = recipients.filter(r => !emailRegex.test(r));
  if (invalid.length) {
    const err = new Error('Emails invalides: ' + invalid.join(', '));
    err.code = 'EMAIL_VALIDATION';
    throw err;
  }
  const fromEmail = process.env.SWEEGO_SENDER || cfg.sweego?.sender || process.env.RESEND_SENDER || cfg.resend?.sender || 'no-reply@cactus-tech.fr';
  const fromName = process.env.SWEEGO_SENDER_NAME || cfg.sweego?.sender_name || process.env.RESEND_SENDER_NAME || cfg.resend?.sender_name || 'Cactus-Tech';

  const attempts = [];

  // Provider 1: Sweego (multi)
  const sweegoKey = process.env.SWEEGO_API_KEY || cfg.sweego?.apikey || cfg.sweego?.api_key;
  if (sweegoKey) {
    try {
      await sendEmailToMultiple({ recipients, subject, html });
      return { provider: 'sweego', meta: { fromEmail, attempts } };
    } catch (e) {
      attempts.push({ provider: 'sweego', status: e.status, snippet: e.snippet });
      console.warn('[emailUnified] Sweego failed, fallback to Resend', e.status, e.snippet);
    }
  } else {
    attempts.push({ provider: 'sweego', skipped: true });
  }

  // Provider 2: Resend
  const resendKey = process.env.RESEND_API_KEY || cfg.resend?.api_key || cfg.resend?.apikey;
  if (resendKey) {
    try {
      const payload = {
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject,
        html,
      };
      const resp = await axios.post('https://api.resend.com/emails', payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        timeout: 10000,
      });
      console.log('[emailUnified] Resend success', { count: recipients.length });
      return { provider: 'resend', meta: { id: resp.data?.id, attempts } };
    } catch (e) {
      const status = e.response?.status;
      const body = e.response?.data;
      const snippet = typeof body === 'string' ? body.slice(0,300) : JSON.stringify(body || {}).slice(0,300);
      attempts.push({ provider: 'resend', status, snippet });
      const err = new Error('Echec Resend');
      err.code = 'EMAIL_SEND_FAILED';
      err.status = status;
      err.snippet = snippet;
      err.providerTried = 'resend';
      err.attempts = attempts;
      throw err;
    }
  } else {
    attempts.push({ provider: 'resend', skipped: true });
  }

  const finalErr = new Error('Aucun provider n\'a pu envoyer l\'email');
  finalErr.code = 'EMAIL_SEND_FAILED';
  finalErr.providerTried = 'none';
  finalErr.attempts = attempts;
  throw finalErr;
}

// Fonction pour supprimer un utilisateur
exports.deleteUser = onCall({ region: "europe-west9" }, async (request) => {
  const { targetUserId } = request.data;

  // Vérifier que l'utilisateur est authentifié et est admin
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }

  const userRecord = await admin.auth().getUser(request.auth.uid);
  if (!userRecord.customClaims || !userRecord.customClaims.admin) {
    throw new HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent supprimer des utilisateurs"
    );
  }

  if (!targetUserId) {
    throw new HttpsError("invalid-argument", "L'ID utilisateur est requis");
  }

  try {
    // Empêcher la suppression de son propre compte
    if (targetUserId === request.auth.uid) {
      throw new HttpsError(
        "failed-precondition",
        "Vous ne pouvez pas supprimer votre propre compte"
      );
    }

    // Supprimer l'utilisateur
    await admin.auth().deleteUser(targetUserId);

    return {
      success: true,
      message: "Utilisateur supprimé avec succès",
    };
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "Utilisateur non trouvé");
    }
    throw new HttpsError("internal", error.message);
  }
});

// Fonction pour envoyer un email de réinitialisation de mot de passe
exports.sendPasswordReset = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { email } = request.data;

    // Vérifier que l'utilisateur est authentifié et est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
    }

    const userRecord = await admin.auth().getUser(request.auth.uid);
    if (!userRecord.customClaims || !userRecord.customClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Seuls les administrateurs peuvent envoyer des emails de réinitialisation"
      );
    }

    if (!email) {
      throw new HttpsError("invalid-argument", "L'email est requis");
    }

    try {
      // Générer un lien de réinitialisation de mot de passe
      const resetLink = await admin.auth().generatePasswordResetLink(email);

      // Envoyer l'email via votre service d'email
      // Pour l'instant, on retourne juste le succès
      // Vous pouvez intégrer votre service d'email ici

      return {
        success: true,
        message: `Email de réinitialisation envoyé à ${email}`,
        resetLink: resetLink, // À ne pas exposer en production
      };
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "Utilisateur non trouvé");
      }
      throw new HttpsError("internal", error.message);
    }
  }
);

// Fonction pour envoyer un email de vérification
exports.sendEmailVerification = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { targetUserId } = request.data;

    // Vérifier que l'utilisateur est authentifié et est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
    }

    const userRecord = await admin.auth().getUser(request.auth.uid);
    if (!userRecord.customClaims || !userRecord.customClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Seuls les administrateurs peuvent envoyer des emails de vérification"
      );
    }

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "L'ID utilisateur est requis");
    }

    try {
      const targetUser = await admin.auth().getUser(targetUserId);

      // Générer un lien de vérification d'email
      const verificationLink = await admin
        .auth()
        .generateEmailVerificationLink(targetUser.email);

      // Envoyer l'email via votre service d'email
      // Pour l'instant, on retourne juste le succès
      // Vous pouvez intégrer votre service d'email ici

      return {
        success: true,
        message: `Email de vérification envoyé à ${targetUser.email}`,
        verificationLink: verificationLink, // À ne pas exposer en production
      };
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "Utilisateur non trouvé");
      }
      throw new HttpsError("internal", error.message);
    }
  }
);

// Fonction pour mettre à jour les informations d'un utilisateur
exports.updateUser = onCall({ region: "europe-west9" }, async (request) => {
  const { targetUserId, updateData } = request.data;

  // Vérifier que l'utilisateur est authentifié et est admin
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
  }

  const userRecord = await admin.auth().getUser(request.auth.uid);
  if (!userRecord.customClaims || !userRecord.customClaims.admin) {
    throw new HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent modifier les utilisateurs"
    );
  }

  if (!targetUserId || !updateData) {
    throw new HttpsError(
      "invalid-argument",
      "L'ID utilisateur et les données de mise à jour sont requis"
    );
  }

  try {
    const targetRecord = await admin.auth().getUser(targetUserId);

    // Préparer les données de mise à jour pour Firebase Auth
    const updateFields = {};

    if (updateData.displayName !== undefined) {
      updateFields.displayName = updateData.displayName;
    }

    if (updateData.email !== undefined) {
      updateFields.email = updateData.email;
    }

    if (updateData.password !== undefined) {
      if (typeof updateData.password !== "string" || updateData.password.length < 8) {
        throw new HttpsError(
          "invalid-argument",
          "Le mot de passe doit contenir au moins 8 caractères"
        );
      }
      updateFields.password = updateData.password;
    }

    if (Object.keys(updateFields).length > 0) {
      await admin.auth().updateUser(targetUserId, updateFields);
    }

    // Optionnel : Sauvegarder les informations supplémentaires dans Firestore
    if (
      updateData.firstName !== undefined ||
      updateData.lastName !== undefined ||
      updateData.operation !== undefined
    ) {
      const db = admin.firestore();
      const extraData = {
        ...(updateData.firstName !== undefined
          ? { firstName: updateData.firstName }
          : {}),
        ...(updateData.lastName !== undefined
          ? { lastName: updateData.lastName }
          : {}),
        ...(updateData.operation !== undefined
          ? { operation: updateData.operation }
          : {}),
      };

      if (Object.keys(extraData).length > 0) {
        extraData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await db
          .collection("users")
          .doc(targetUserId)
          .set(extraData, { merge: true });
      }
    }

    if (updateData.operation !== undefined) {
      const newClaims = {
        ...(targetRecord.customClaims || {}),
        operation: updateData.operation,
      };
      await admin.auth().setCustomUserClaims(targetUserId, newClaims);
    }

    return {
      success: true,
      message: "Utilisateur mis à jour avec succès",
    };
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "Utilisateur non trouvé");
    }
    throw new HttpsError("internal", error.message);
  }
});

// Fonction pour mettre à jour les claims des utilisateurs pour une mission
exports.updateMissionClaims = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { missionId, users } = request.data;

    if (!missionId || !users || !Array.isArray(users)) {
      throw new HttpsError(
        "invalid-argument",
        "Les données de mission et utilisateurs sont requises"
      );
    }

    try {
      // Vérifier que l'utilisateur qui fait la demande est admin
      const callerUid = request.auth?.uid;
      if (!callerUid) {
        throw new HttpsError("unauthenticated", "Authentification requise");
      }

      const callerRecord = await admin.auth().getUser(callerUid);
      const callerClaims = callerRecord.customClaims || {};

      if (!callerClaims.admin) {
        throw new HttpsError(
          "permission-denied",
          "Seuls les administrateurs peuvent modifier les claims de mission"
        );
      }

      // Mettre à jour les claims pour chaque utilisateur
      const promises = users.map(async (user) => {
        try {
          const userRecord = await admin.auth().getUser(user.uid);
          const currentClaims = userRecord.customClaims || {};

          // Ajouter ou mettre à jour les claims de mission
          const missionClaims = currentClaims.missions || {};
          missionClaims[missionId] = {
            role: user.role,
            assignedAt: admin.firestore.Timestamp.now(),
          };

          const newClaims = {
            ...currentClaims,
            missions: missionClaims,
          };

          await admin.auth().setCustomUserClaims(user.uid, newClaims);
          return { success: true, uid: user.uid };
        } catch (error) {
          console.error(
            `Erreur lors de la mise à jour des claims pour l'utilisateur ${user.uid}:`,
            error
          );
          return { success: false, uid: user.uid, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return {
        success: true,
        message: `Claims mis à jour pour ${successCount} utilisateur(s)`,
        details: {
          successCount,
          failureCount,
          results,
        },
      };
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour des claims de mission:",
        error
      );
      throw new HttpsError(
        "internal",
        "Erreur lors de la mise à jour des claims de mission"
      );
    }
  }
);

// Fonction pour supprimer les claims des utilisateurs d'une mission
exports.removeMissionClaims = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { missionId, userIds } = request.data;

    if (!missionId || !userIds || !Array.isArray(userIds)) {
      throw new HttpsError(
        "invalid-argument",
        "L'ID de mission et les IDs d'utilisateurs sont requis"
      );
    }

    try {
      // Vérifier que l'utilisateur qui fait la demande est admin
      const callerUid = request.auth?.uid;
      if (!callerUid) {
        throw new HttpsError("unauthenticated", "Authentification requise");
      }

      const callerRecord = await admin.auth().getUser(callerUid);
      const callerClaims = callerRecord.customClaims || {};

      if (!callerClaims.admin) {
        throw new HttpsError(
          "permission-denied",
          "Seuls les administrateurs peuvent modifier les claims de mission"
        );
      }

      // Supprimer les claims pour chaque utilisateur
      const promises = userIds.map(async (userId) => {
        try {
          const userRecord = await admin.auth().getUser(userId);
          const currentClaims = userRecord.customClaims || {};

          // Supprimer les claims de mission
          const missionClaims = currentClaims.missions || {};
          delete missionClaims[missionId];

          const newClaims = {
            ...currentClaims,
            missions: missionClaims,
          };

          await admin.auth().setCustomUserClaims(userId, newClaims);
          return { success: true, uid: userId };
        } catch (error) {
          console.error(
            `Erreur lors de la suppression des claims pour l'utilisateur ${userId}:`,
            error
          );
          return { success: false, uid: userId, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return {
        success: true,
        message: `Claims supprimés pour ${successCount} utilisateur(s)`,
        details: {
          successCount,
          failureCount,
          results,
        },
      };
    } catch (error) {
      console.error(
        "Erreur lors de la suppression des claims de mission:",
        error
      );
      throw new HttpsError(
        "internal",
        "Erreur lors de la suppression des claims de mission"
      );
    }
  }
);

// Fonction admin pour créer une mission côté serveur et propager les claims
exports.createMissionAdmin = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { missionData, users, serverKey } = request.data || {};

    if (!missionData || !missionData.name) {
      throw new HttpsError("invalid-argument", "Données de mission invalides");
    }

    try {
      // Vérifier l'authentification du caller
      const callerUid = request.auth?.uid;
      let callerRecord = null;
      let callerClaims = {};

      if (callerUid) {
        callerRecord = await admin.auth().getUser(callerUid);
        callerClaims = callerRecord.customClaims || {};
      }

      // Autoriser si caller admin OR si serverKey correspond à la clé configurée
      const functionsConfig = functions.config ? functions.config() : {};
      const configuredKey = functionsConfig?.admin?.key || process.env.ADMIN_FUNCTION_KEY || null;

      const isAdminCaller = callerClaims && (callerClaims.admin === true || callerClaims.direction === true);
      const validServerKey = serverKey && configuredKey && serverKey === configuredKey;

      if (!isAdminCaller && !validServerKey) {
        throw new HttpsError("permission-denied", "Seuls les administrateurs ou un serveur autorisé peuvent créer une mission");
      }

      const db = admin.firestore();

      // Préparer la donnée mission
      const now = admin.firestore.Timestamp.now();
      const mission = {
        name: String(missionData.name),
        description: missionData.description ? String(missionData.description) : "",
        users: Array.isArray(users) ? users.map(u => ({ uid: u.uid, email: u.email, displayName: u.displayName || '', role: u.role || 'ta', assignedAt: now })) : [],
        isActive: typeof missionData.isActive === 'boolean' ? missionData.isActive : true,
        createdBy: callerUid || 'server',
        startDate: missionData.startDate || null,
        endDate: missionData.endDate || null,
        allowSelfRegistration: !!missionData.allowSelfRegistration,
        maxUsers: missionData.maxUsers || 50,
        createdAt: now,
        updatedAt: now,
      };

      // Créer la mission
      const docRef = await db.collection('missions').add(mission);
      const missionId = docRef.id;

      // Propager les claims si des utilisateurs sont fournis
      if (Array.isArray(users) && users.length > 0) {
        const promiseResults = await Promise.all(users.map(async (u) => {
          try {
            const userRecord = await admin.auth().getUser(u.uid);
            const currentClaims = userRecord.customClaims || {};

            const missionClaims = currentClaims.missions || {};
            missionClaims[missionId] = { role: u.role || 'ta', assignedAt: admin.firestore.Timestamp.now() };

            const newClaims = { ...currentClaims, missions: missionClaims };
            await admin.auth().setCustomUserClaims(u.uid, newClaims);
            return { success: true, uid: u.uid };
          } catch (err) {
            console.error(`Erreur lors de la mise à jour des claims pour ${u.uid}:`, err);
            return { success: false, uid: u.uid, error: err.message };
          }
        }));

        return { success: true, missionId, claimResults: promiseResults };
      }

      return { success: true, missionId };
    } catch (error) {
      console.error('createMissionAdmin error', error);
      throw new HttpsError('internal', error.message || 'Erreur création mission');
    }
  }
);

// Fonction pour rechercher un utilisateur par email
exports.findUserByEmail = onCall(
  { region: "europe-west9" },
  async (request) => {
    const { email } = request.data;

    if (!email) {
      throw new HttpsError("invalid-argument", "L'email est requis");
    }

    try {
      // Vérifier que l'utilisateur qui fait la demande est admin
      const callerUid = request.auth?.uid;
      if (!callerUid) {
        throw new HttpsError("unauthenticated", "Authentification requise");
      }

      const callerRecord = await admin.auth().getUser(callerUid);
      const callerClaims = callerRecord.customClaims || {};

      if (!callerClaims.admin) {
        throw new HttpsError(
          "permission-denied",
          "Seuls les administrateurs peuvent rechercher des utilisateurs"
        );
      }

      // Rechercher l'utilisateur par email
      const userRecord = await admin.auth().getUserByEmail(email);

      return {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          customClaims: userRecord.customClaims || {},
        },
      };
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError(
          "not-found",
          "Aucun utilisateur trouvé avec cette adresse email"
        );
      }

      console.error("Erreur lors de la recherche d'utilisateur:", error);
      throw new HttpsError(
        "internal",
        "Erreur lors de la recherche d'utilisateur"
      );
    }
  }
);
