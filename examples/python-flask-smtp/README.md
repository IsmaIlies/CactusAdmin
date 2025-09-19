# Flask + SMTP — Exemple complet

Backend Python (Flask + smtplib) avec route `POST /api/send-email`.

Important: les destinataires (TO) sont FIXES côté serveur (i.boultame@mars-marketing.fr, i.brai@mars-marketing.fr).

## 1) Prérequis
- Python 3.10+

## 2) Installation (Windows PowerShell)
```
cd examples/python-flask-smtp
Copy-Item .env.example .env
# Editez .env et mettez vos paramètres SMTP
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python backend.py
```
Le backend écoute sur http://localhost:5001.

## 3) Appel API (exemple JS)
```
fetch('http://localhost:5001/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Test',
    message: 'Bonjour',
    cc: ['a@ex.com'],
    bcc: [],
    replyTo: 'toi@ex.com'
  })
}).then(r => r.json()).then(console.log)
```

## 4) Sécurité
- Limiteur 10 req/min/IP (Flask-Limiter)
- CORS configurable via env (Flask-Cors)
- TO côté serveur