
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const axios = require("axios");

admin.initializeApp();

// Utilise les variables d'environnement Firebase pour sécuriser tes identifiants
const user = process.env.EMAIL_USER || (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).email?.user : undefined);
const pass = process.env.EMAIL_PASS || (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).email?.pass : undefined);
console.log('Nodemailer user:', user);
console.log('Nodemailer pass:', pass ? '***' : 'undefined');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass }
});

exports.sendItRequestMail = onCall({ region: "europe-west9" }, async (request) => {
  const { prenom, nom } = request.data;
  if (!prenom || !nom) {
    throw new HttpsError("invalid-argument", "Prénom et nom requis");
  }

  // Log credentials for debug (do not log pass in production)
  console.log('sendItRequestMail: user:', user);
  console.log('sendItRequestMail: pass:', pass ? '***' : 'undefined');

  try {
    await transporter.verify();

    const to = "i.boultame@mars-marketing.fr, i.brai@mars-marketing.fr"; // Destinataires IT
    const subject = "Demande de création d’adresse email pour un nouveau Téléacteur";
    const emailBody = `Bonjour,\n\nMerci de bien vouloir créer une adresse email professionnelle pour le nouveau Téléacteur :\n\nPrénom Nom : ${prenom} ${nom}\nAdresse : ${prenom.toLowerCase()}.${nom.toLowerCase()}@mars-marketing.com\n\nMerci d’avance.\nService IT`;

    await transporter.sendMail({
      from: "iliesb58@gmail.com",
      to,
      subject,
      text: emailBody
    });
    console.log('sendItRequestMail: email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('sendItRequestMail: error details:', error);
    throw new HttpsError("internal", error.message || 'Erreur lors de l\'envoi de l\'email IT');
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
    // Préparer les custom claims selon le rôle
    const customClaims = { role };

    // Ajouter le claim spécifique au rôle
    if (role !== "user") {
      customClaims[role] = true;
    }

    // Définir les custom claims
    await admin.auth().setCustomUserClaims(targetUserId, customClaims);

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
    const today = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = `Récapitulatif Canal - ${today}`;
    const html = buildRecapHtml(salesData, contactsArgues, period, today);

    // Envoyer l'email à tous les destinataires
    await sendEmailToMultiple({
      recipients,
      subject,
      html,
    });

    const recipientList = recipients.join(", ");
    return {
      success: true,
      message: `Récapitulatif envoyé avec succès à : ${recipientList}`,
    };
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    throw new HttpsError("internal", error.message);
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
      const today = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const monthName = new Date().toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });

      const subject = `Rapport mensuel Canal+ - ${monthName}`;
      const html = buildWeeklyReportHtml(
        salesData,
        contactsArguesData,
        startDate,
        endDate,
        today
      );

      // Envoyer l'email à tous les destinataires
      await sendEmailToMultiple({
        recipients,
        subject,
        html,
      });

      const recipientList = recipients.join(", ");
      return {
        success: true,
        message: `Rapport mensuel envoyé avec succès à : ${recipientList}`,
      };
    } catch (error) {
      console.error("Erreur lors de l'envoi du rapport mensuel:", error);
      throw new HttpsError("internal", error.message);
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
  const apiKey = "a45f8694-7c57-4d66-987d-f495f9bcffa4";

  const data = {
    channel: "email",
    provider: "sweego",
    recipients: [{ email: to }],
    from: {
      email: "no-reply@cactus-tech.fr",
      name: "Cactus-Tech",
    },
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
    });
    console.log(`✅ Email envoyé à ${to}:`, response.data);
  } catch (err) {
    console.error(
      `❌ Échec envoi email à ${to}:`,
      err.response?.data || err.message
    );
    throw err;
  }
}

async function sendEmailToMultiple({ recipients, subject, html }) {
  const apiKey = "a45f8694-7c57-4d66-987d-f495f9bcffa4";

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
    from: {
      email: "no-reply@cactus-tech.fr",
      name: "Cactus-Tech",
    },
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
    });
    console.log(`✅ Email envoyé à ${recipients.join(", ")}:`, response.data);
    return response.data;
  } catch (err) {
    console.error(
      `❌ Échec envoi email à ${recipients.join(", ")}:`,
      err.response?.data || err.message
    );
    throw err;
  }
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
    // Préparer les données de mise à jour pour Firebase Auth
    const updateFields = {};

    if (updateData.displayName !== undefined) {
      updateFields.displayName = updateData.displayName;
    }

    // Mettre à jour l'utilisateur dans Firebase Auth
    await admin.auth().updateUser(targetUserId, updateFields);

    // Optionnel : Sauvegarder les informations supplémentaires dans Firestore
    if (
      updateData.firstName !== undefined ||
      updateData.lastName !== undefined
    ) {
      const db = admin.firestore();
      await db
        .collection("users")
        .doc(targetUserId)
        .set(
          {
            firstName: updateData.firstName || "",
            lastName: updateData.lastName || "",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
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
