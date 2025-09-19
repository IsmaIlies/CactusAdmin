import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.getenv('CORS_ORIGIN', '*')}})
limiter = Limiter(get_remote_address, app=app, default_limits=[])

FIXED_TO = [
    'i.boultame@mars-marketing.fr',
    'i.brai@mars-marketing.fr',
]

def validate_payload(data):
    errors = []
    if not isinstance(data, dict):
        errors.append('Invalid JSON body')
        return errors
    if not data.get('subject') or not isinstance(data.get('subject'), str):
        errors.append('subject is required')
    if not data.get('message') or not isinstance(data.get('message'), str):
        errors.append('message is required')
    if 'cc' in data and not isinstance(data['cc'], list):
        errors.append('cc must be an array of emails')
    if 'bcc' in data and not isinstance(data['bcc'], list):
        errors.append('bcc must be an array of emails')
    if 'replyTo' in data and not isinstance(data['replyTo'], str):
        errors.append('replyTo must be a string')
    return errors

@app.route('/api/send-email', methods=['POST'])
@limiter.limit('10 per minute')
def send_email():
    try:
        data = request.get_json(silent=True) or {}
        errors = validate_payload(data)
        if errors:
            return jsonify({ 'ok': False, 'errors': errors }), 400

        subject = data['subject']
        message = data['message']
        cc = data.get('cc') or []
        bcc = data.get('bcc') or []
        reply_to = data.get('replyTo')

        mail_from_name = os.getenv('MAIL_FROM_NAME', 'Cactus Admin')
        mail_from = os.getenv('MAIL_FROM', 'no-reply@admin.cactus-tech.fr')

        # SMTP config
        host = os.getenv('SMTP_HOST')
        port = int(os.getenv('SMTP_PORT', '587'))
        secure = os.getenv('SMTP_SECURE', 'false').lower() == 'true'
        user = os.getenv('SMTP_USER')
        pw = os.getenv('SMTP_PASS')

        if not host or not port:
            return jsonify({ 'ok': False, 'error': 'SMTP_HOST and SMTP_PORT are required' }), 500

        # Build email
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{mail_from_name} <{mail_from}>"
        msg['To'] = ', '.join(FIXED_TO)
        msg['Subject'] = subject
        if reply_to:
            msg['Reply-To'] = reply_to
        if cc:
            msg['Cc'] = ', '.join(cc)
        if bcc:
            # BCC is not placed in headers but used during send
            pass

        text_part = MIMEText(message, 'plain', 'utf-8')
        html_part = MIMEText(f"<p>{message.replace('\n', '<br/>')}</p>", 'html', 'utf-8')
        msg.attach(text_part)
        msg.attach(html_part)

        recipients = FIXED_TO + cc + bcc

        if secure:
            server = smtplib.SMTP_SSL(host, port)
        else:
            server = smtplib.SMTP(host, port)
            server.starttls()
        if user and pw:
            server.login(user, pw)
        server.sendmail(mail_from, recipients, msg.as_string())
        server.quit()

        return jsonify({ 'ok': True })
    except Exception as e:
        return jsonify({ 'ok': False, 'error': str(e) }), 500

@app.get('/healthz')
def healthz():
    return jsonify({ 'ok': True })

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5001'))
    app.run(host='0.0.0.0', port=port)
