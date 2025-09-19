# Express + Nodemailer — Exemple complet

Backend Node.js (Express + Nodemailer) avec route `POST /api/send-email` et un mini frontend (bouton) pour déclencher l'envoi.

Important: les destinataires (TO) sont FIXES côté serveur (i.boultame@mars-marketing.fr, i.brai@mars-marketing.fr).

## 1) Prérequis
- Node.js 18+
- Un serveur SMTP (ou un compte SMTP de test, ex. Ethereal)

## 2) Installation (Windows PowerShell)
```powershell
cd examples/node-express-nodemailer
Copy-Item .env.example .env
# Editez .env et mettez vos paramètres SMTP
npm install
npm start
```
Le backend écoute sur http://localhost:3001.

## 3) Frontend de test
Ouvrez `public/index.html` dans votre navigateur. Renseignez sujet/message, puis cliquez sur le bouton. L'API est appelée en `http://localhost:3001/api/send-email`.

## 4) Variables d'environnement (.env)
- PORT: port du serveur Express (par défaut 3001)
- CORS_ORIGIN: origine autorisée (ex: http://localhost:3000). Mettre `*` en dev.
- SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS: config SMTP
- MAIL_FROM, MAIL_FROM_NAME: identité d'envoi

## 5) Sécurité
- Limiteur de requêtes: 10 req/min/IP sur `/api/send-email`
- CORS: configurable via `CORS_ORIGIN`
- TO côté serveur: non modifiable par le client

## 6) Notes
- Si l'envoi échoue, consultez la console du serveur pour le détail (erreur SMTP, auth, firewall, etc.)
- Si vous testez via un autre poste, pensez à autoriser le port 3001 dans votre pare-feu.