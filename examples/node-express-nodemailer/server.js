// Simple Express + Nodemailer example
// Security: basic CORS + rate limit
// API: POST /api/send-email { subject, message, cc, bcc, replyTo }
// NOTE: Recipient list (To) is FIXED on the server side for security.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// Minimal CORS: allow same-origin or a specific frontend origin via env
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

// JSON body parsing
app.use(express.json({ limit: '256kb' }));

// Rate limit: 10 req/min/IP on the send endpoint
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Create nodemailer transporter from env
function createTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT) {
    throw new Error('SMTP_HOST and SMTP_PORT are required');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

// Fixed recipients (TO) on server side
const FIXED_TO = [
  'i.boultame@mars-marketing.fr',
  'i.brai@mars-marketing.fr',
];

// Helper: validate basic fields
function validatePayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('Invalid JSON body');
  if (!body?.subject || typeof body.subject !== 'string') errors.push('subject is required');
  if (!body?.message || typeof body.message !== 'string') errors.push('message is required');
  if (body?.cc && !Array.isArray(body.cc)) errors.push('cc must be an array of emails');
  if (body?.bcc && !Array.isArray(body.bcc)) errors.push('bcc must be an array of emails');
  if (body?.replyTo && typeof body.replyTo !== 'string') errors.push('replyTo must be a string');
  return errors;
}

app.post('/api/send-email', sendLimiter, async (req, res) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ ok: false, errors });

    const { subject, message, cc, bcc, replyTo } = req.body;
    const fromName = process.env.MAIL_FROM_NAME || 'Cactus Admin';
    const fromEmail = process.env.MAIL_FROM || 'no-reply@admin.cactus-tech.fr';

    const transporter = createTransporter();

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: FIXED_TO,
      subject,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
      ...(replyTo ? { replyTo } : {}),
      ...(Array.isArray(cc) && cc.length ? { cc } : {}),
      ...(Array.isArray(bcc) && bcc.length ? { bcc } : {}),
    };

    // Optional safeguard: limit body length
    if (mailOptions.text && mailOptions.text.length > 5000) {
      return res.status(413).json({ ok: false, error: 'Message too large' });
    }

    const info = await transporter.sendMail(mailOptions);
    return res.json({ ok: true, id: info.messageId });
  } catch (err) {
    console.error('send-email error', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Minimal endpoint: send attendance recap with present/absent and sales count
// Body: { present: string[] | string, absent: string[] | string, salesCount: number, message?: string, subject?: string }
app.post('/api/send-attendance-recap', sendLimiter, async (req, res) => {
  try {
    const { present, absent, salesCount, message, subject } = req.body || {};

    // Normalize inputs
    const toArray = (v) => Array.isArray(v)
      ? v
      : (typeof v === 'string' ? v.split(/\r?\n|,/) : [])
          .map(s => String(s).trim())
          .filter(Boolean);
    const presentList = toArray(present);
    const absentList = toArray(absent);
    const sales = Number.isFinite(Number(salesCount)) ? Number(salesCount) : 0;
    const note = typeof message === 'string' ? message : '';

    const fromName = process.env.MAIL_FROM_NAME || 'Cactus Admin';
    const fromEmail = process.env.MAIL_FROM || 'no-reply@admin.cactus-tech.fr';
    const transporter = createTransporter();

    const today = new Date().toLocaleDateString('fr-FR');
    const mailSubject = subject && typeof subject === 'string' && subject.trim().length
      ? subject
      : `Feuille de présence TA - ${today}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
        <h2 style="margin:0 0 8px">Feuille de présence TA</h2>
        <div style="color:#666;font-size:12px;margin-bottom:16px">${today}</div>
        <div style="margin-bottom:12px"><strong>Ventes:</strong> ${sales}</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          <div>
            <h3 style="margin:8px 0">Présents (${presentList.length})</h3>
            <ul>
              ${presentList.map(p => `<li>${p}</li>`).join('') || '<li>—</li>'}
            </ul>
          </div>
          <div>
            <h3 style="margin:8px 0">Absents (${absentList.length})</h3>
            <ul>
              ${absentList.map(a => `<li>${a}</li>`).join('') || '<li>—</li>'}
            </ul>
          </div>
        </div>
        ${note ? `<div style="margin-top:12px"><strong>Message:</strong><br/>${note.replace(/\n/g,'<br/>')}</div>` : ''}
        <div style="margin-top:16px;color:#888;font-size:12px">Email automatique Cactus</div>
      </div>`;

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: FIXED_TO,
      subject: mailSubject,
      text: `Feuille de présence TA\nDate: ${today}\nVentes: ${sales}\n\nPrésents (${presentList.length}):\n- ${presentList.join('\n- ') || ''}\n\nAbsents (${absentList.length}):\n- ${absentList.join('\n- ') || ''}\n\n${note ? 'Message:\n' + note : ''}`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return res.json({ ok: true, id: info.messageId });
  } catch (err) {
    console.error('send-attendance-recap error', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Email backend listening on http://localhost:${PORT}`);
});
