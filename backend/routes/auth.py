from flask import Blueprint, request, jsonify, current_app
from extensions import db, bcrypt, jwt, mail
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from datetime import datetime, timedelta
import requests
import uuid
import random

auth_bp = Blueprint('auth', __name__)


def verify_turnstile(token):
    secret_key = current_app.config['TURNSTILE_SECRET_KEY']
    # In development mode with the dummy test key, always pass
    if secret_key == '1x0000000000000000000000000000000AA':
        return True
    url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    payload = {
        'secret': secret_key,
        'response': token
    }
    try:
        response = requests.post(url, data=payload)
        result = response.json()
        return result.get('success', False)
    except Exception as e:
        print(f"Turnstile verification error: {e}")
        return False


def build_verification_email_html(username, verify_url):
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Taraftaryum - E-posta Doğrulama</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0A0A;padding:40px 0;">
<tr>
<td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#151515;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,212,255,0.1);">
<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#00D4FF 0%,#007BFF 100%);padding:40px 30px;text-align:center;">
<h1 style="margin:0;font-size:32px;color:#FFFFFF;font-weight:800;letter-spacing:1px;">
⚽ Taraftaryum
</h1>
<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);letter-spacing:2px;text-transform:uppercase;">
Taraftar Platformu
</p>
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:50px 40px;">
<h2 style="margin:0 0 10px;font-size:24px;color:#FFFFFF;font-weight:700;">
Merhaba {username}! 👋
</h2>
<p style="margin:0 0 30px;font-size:16px;color:#AAAAAA;line-height:1.6;">
Taraftaryum ailesine hoş geldin! Hesabını aktifleştirmek ve tüm özellikleri kullanabilmek için e-posta adresini doğrulamanı istiyoruz.
</p>

<h3 style="margin:0 0 25px;font-size:20px;color:#00D4FF;font-weight:600;text-align:center;">
E-posta adresinizi doğrulayın
</h3>

<!-- Button -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:10px 0 35px;">
<a href="{verify_url}" target="_blank" style="display:inline-block;padding:16px 50px;background:linear-gradient(135deg,#00D4FF 0%,#007BFF 100%);color:#FFFFFF;text-decoration:none;font-size:18px;font-weight:700;border-radius:50px;letter-spacing:0.5px;box-shadow:0 8px 25px rgba(0,123,255,0.35);">
✉️ E-Postamı Doğrula
</a>
</td>
</tr>
</table>

<p style="margin:0 0 15px;font-size:13px;color:#666666;line-height:1.5;">
Eğer buton çalışmıyorsa, aşağıdaki bağlantıyı tarayıcınıza kopyalayın:
</p>
<p style="margin:0 0 30px;font-size:12px;color:#00D4FF;word-break:break-all;background-color:#0A0A0A;padding:12px 16px;border-radius:8px;border:1px solid #222222;">
{verify_url}
</p>

<!-- Info Box -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="background-color:#0A0A0A;border-radius:12px;padding:20px 24px;border:1px solid #222222;">
<p style="margin:0 0 8px;font-size:14px;color:#00D4FF;font-weight:600;">
🔒 Güvenlik Bilgisi
</p>
<p style="margin:0;font-size:13px;color:#888888;line-height:1.5;">
Bu bağlantı 24 saat geçerlidir. Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.
</p>
</td>
</tr>
</table>
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background-color:#0D0D0D;padding:30px 40px;text-align:center;border-top:1px solid #1A1A1A;">
<p style="margin:0 0 8px;font-size:14px;color:#555555;">
⚽ Taraftaryum Taraftar Platformu
</p>
<p style="margin:0;font-size:12px;color:#333333;">
© 2026 Taraftaryum. Tüm hakları saklıdır.
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>"""


def send_verification_email(user):
    try:
        from flask import request
        host_parts = request.host.split(':')
        hostname = host_parts[0]
        frontend_url = f"http://{hostname}:8081"
    except Exception:
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:8081')
    verify_url = f"{frontend_url}/verify?token={user.verification_token}"
    html_body = build_verification_email_html(user.username, verify_url)

    msg = Message(
        subject="Taraftaryum - E-posta Doğrulama ⚽",
        recipients=[user.email],
        html=html_body
    )
    
    print("\n" + "="*50)
    print(f"🔗 DOĞRULAMA LİNKİ (SMTP çalışmazsa buraya tıklayın):")
    print(verify_url)
    print("="*50 + "\n")
    
    try:
        mail.send(msg)
        print(f">>> Doğrulama e-postası başarıyla gönderildi: {user.email}")
    except Exception as e:
        print(f">>> E-posta gönderme hatası: {e}")
        raise e


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    turnstile_token = data.get('turnstile_token', 'dev_bypass')

    if not all([username, email, password]):
        return jsonify({"message": "Tüm alanları doldurunuz."}), 400

    # Verify Turnstile (auto-pass in dev mode)
    if not verify_turnstile(turnstile_token):
        return jsonify({"message": "Bot doğrulaması başarısız oldu."}), 403

    # Check if user exists
    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Bu kullanıcı adı zaten alınmış."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Bu e-posta adresi zaten kayıtlı."}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    verification_token = str(uuid.uuid4())

    new_user = User(
        username=username,
        email=email,
        password_hash=hashed_pw,
        is_verified=False,
        verification_token=verification_token,
        token_created_at=datetime.utcnow()
    )

    db.session.add(new_user)
    db.session.commit()
    print(f">>> Yeni kullanıcı kaydedildi: {username}")

    # Send verification email
    try:
        send_verification_email(new_user)
        msg_text = "Kayıt başarılı! Lütfen e-posta adresinizi kontrol edin ve hesabınızı doğrulayın."
    except Exception as e:
        print(f">>> SMTP Hatası (Test moduna geçiliyor): {e}")
        msg_text = "Kayıt başarılı! (E-posta sunucusu kapalı olduğu için test modunda devam ediliyor)"

    return jsonify({
        "message": msg_text,
        "test_token": new_user.verification_token
    }), 201


@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return jsonify({"message": "Geçersiz veya süresi dolmuş doğrulama bağlantısı."}), 400

    user.is_verified = True
    user.verification_token = None
    user.token_created_at = None
    db.session.commit()

    return jsonify({"message": "E-posta başarıyla doğrulandı! Artık giriş yapabilirsiniz."}), 200


@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"message": "E-posta adresi gereklidir."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı."}), 404

    if user.is_verified:
        return jsonify({"message": "Bu hesap zaten doğrulanmış."}), 400

    # Generate new token
    user.verification_token = str(uuid.uuid4())
    user.token_created_at = datetime.utcnow()
    db.session.commit()

    try:
        send_verification_email(user)
        msg_text = "Doğrulama e-postası tekrar gönderildi. Lütfen gelen kutunuzu kontrol edin."
    except Exception as e:
        print(f">>> SMTP Hatası (Test moduna geçiliyor): {e}")
        msg_text = "Test Modu: E-posta sunucusu kapalı ancak test doğrulama linki oluşturuldu."

    return jsonify({
        "message": msg_text,
        "test_token": user.verification_token
    }), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    turnstile_token = data.get('turnstile_token', 'dev_bypass')

    # Verify Turnstile
    if not verify_turnstile(turnstile_token):
        return jsonify({"message": "Bot doğrulaması başarısız oldu."}), 403

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Geçersiz kullanıcı adı veya şifre."}), 401

    if user.is_banned:
        return jsonify({"message": "Hesabınız askıya alınmıştır. Lütfen yönetici ile iletişime geçin."}), 403

    if not user.is_verified:
        return jsonify({"message": "Lütfen önce e-posta adresinizi doğrulayın."}), 403

    # Son giriş zamanını ve giriş sayısını güncelle
    user.last_login = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.session.commit()

    # CRITICAL: Use username as identity, not user.id
    access_token = create_access_token(identity=user.username)
    return jsonify({
        "access_token": access_token,
        "username": user.username,
        "favorite_team": user.favorite_team,
        "avatar_color": user.avatar_color,
        "bio": user.bio,
        "is_admin": user.is_admin
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()

    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    return jsonify({
        "username": user.username,
        "email": user.email,
        "favorite_team": user.favorite_team,
        "avatar_color": user.avatar_color,
        "bio": user.bio,
        "is_verified": user.is_verified,
        "created_at": user.created_at.strftime("%d.%m.%Y") if user.created_at else None
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()

    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    data = request.get_json()

    if 'favorite_team' in data:
        user.favorite_team = data['favorite_team']
    if 'bio' in data:
        user.bio = data['bio']
    if 'avatar_color' in data:
        user.avatar_color = data['avatar_color']

    db.session.commit()

    return jsonify({
        "message": "Profil başarıyla güncellendi.",
        "username": user.username,
        "favorite_team": user.favorite_team,
        "avatar_color": user.avatar_color,
        "bio": user.bio
    }), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()

    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({"message": "Eski şifre ve yeni şifre alanları zorunludur."}), 400

    if not bcrypt.check_password_hash(user.password_hash, old_password):
        return jsonify({"message": "Mevcut şifreniz hatalı."}), 401

    if len(new_password) < 6:
        return jsonify({"message": "Yeni şifre en az 6 karakter olmalıdır."}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({"message": "Şifreniz başarıyla değiştirildi."}), 200


# ══════════════════════════════════════════════════════════════
# ŞİFRE SIFIRLAMA (FORGOT PASSWORD)
# ══════════════════════════════════════════════════════════════

def build_reset_code_email_html(username, reset_code):
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Taraftaryum - Şifre Sıfırlama</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0A0A;padding:40px 0;">
<tr>
<td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#151515;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,212,255,0.1);">
<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#FF6B35 0%,#F72585 100%);padding:40px 30px;text-align:center;">
<h1 style="margin:0;font-size:32px;color:#FFFFFF;font-weight:800;letter-spacing:1px;">
⚽ Taraftaryum
</h1>
<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);letter-spacing:2px;text-transform:uppercase;">
Şifre Sıfırlama
</p>
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:50px 40px;">
<h2 style="margin:0 0 10px;font-size:24px;color:#FFFFFF;font-weight:700;">
Merhaba {username}! 🔐
</h2>
<p style="margin:0 0 30px;font-size:16px;color:#AAAAAA;line-height:1.6;">
Şifrenizi sıfırlamak için aşağıdaki doğrulama kodunu kullanın. Bu kod 10 dakika boyunca geçerlidir.
</p>

<!-- Code Box -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:10px 0 35px;">
<div style="display:inline-block;padding:20px 50px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:2px solid #FF6B35;border-radius:16px;">
<span style="font-size:42px;font-weight:800;color:#FF6B35;letter-spacing:12px;font-family:monospace;">
{reset_code}
</span>
</div>
</td>
</tr>
</table>

<!-- Info Box -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="background-color:#0A0A0A;border-radius:12px;padding:20px 24px;border:1px solid #222222;">
<p style="margin:0 0 8px;font-size:14px;color:#FF6B35;font-weight:600;">
⏰ Süre Bilgisi
</p>
<p style="margin:0;font-size:13px;color:#888888;line-height:1.5;">
Bu kod 10 dakika boyunca geçerlidir. Eğer bu işlemi siz başlatmadıysanız, bu e-postayı görmezden gelebilirsiniz.
</p>
</td>
</tr>
</table>
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background-color:#0D0D0D;padding:30px 40px;text-align:center;border-top:1px solid #1A1A1A;">
<p style="margin:0 0 8px;font-size:14px;color:#555555;">
⚽ Taraftaryum Taraftar Platformu
</p>
<p style="margin:0;font-size:12px;color:#333333;">
© 2026 Taraftaryum. Tüm hakları saklıdır.
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>"""


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"message": "E-posta adresi gereklidir."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Güvenlik: Kullanıcı bulunamasa bile aynı mesajı döndür
        return jsonify({"message": "Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama kodu gönderildi."}), 200

    # 6 haneli rastgele kod oluştur
    reset_code = str(random.randint(100000, 999999))
    user.reset_code = reset_code
    user.reset_code_expires = datetime.utcnow() + timedelta(minutes=10)
    db.session.commit()

    # E-posta gönder
    html_body = build_reset_code_email_html(user.username, reset_code)
    msg = Message(
        subject="Taraftaryum - Şifre Sıfırlama Kodu 🔐",
        recipients=[user.email],
        html=html_body
    )

    print("\n" + "="*50)
    print(f"🔑 ŞİFRE SIFIRLAMA KODU ({user.email}): {reset_code}")
    print("="*50 + "\n")

    try:
        mail.send(msg)
        print(f">>> Şifre sıfırlama kodu gönderildi: {user.email}")
    except Exception as e:
        print(f">>> E-posta gönderme hatası: {e}")

    return jsonify({"message": "Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama kodu gönderildi."}), 200


@auth_bp.route('/verify-reset-code', methods=['POST'])
def verify_reset_code():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return jsonify({"message": "E-posta ve doğrulama kodu gereklidir."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Geçersiz e-posta adresi veya doğrulama kodu."}), 400

    if not user.reset_code or user.reset_code != code:
        return jsonify({"message": "Geçersiz doğrulama kodu."}), 400

    if user.reset_code_expires and user.reset_code_expires < datetime.utcnow():
        return jsonify({"message": "Doğrulama kodunun süresi dolmuş. Lütfen yeni bir kod isteyin."}), 400

    return jsonify({"message": "Doğrulama kodu geçerli."}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')
    new_password = data.get('new_password')

    if not all([email, code, new_password]):
        return jsonify({"message": "Tüm alanlar gereklidir."}), 400

    if len(new_password) < 6:
        return jsonify({"message": "Yeni şifre en az 6 karakter olmalıdır."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Geçersiz e-posta adresi veya doğrulama kodu."}), 400

    if not user.reset_code or user.reset_code != code:
        return jsonify({"message": "Geçersiz doğrulama kodu."}), 400

    if user.reset_code_expires and user.reset_code_expires < datetime.utcnow():
        return jsonify({"message": "Doğrulama kodunun süresi dolmuş. Lütfen yeni bir kod isteyin."}), 400

    # Şifreyi güncelle
    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.reset_code = None
    user.reset_code_expires = None

    # Henüz doğrulanmamışsa otomatik doğrula
    if not user.is_verified:
        user.is_verified = True
        user.verification_token = None

    db.session.commit()

    return jsonify({"message": "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz."}), 200


@auth_bp.route('/send-admin-message', methods=['POST'])
@jwt_required()
def send_admin_message():
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    data = request.get_json()
    text = data.get('text', '').strip()

    if not text:
        return jsonify({"message": "Mesaj boş olamaz."}), 400

    if len(text) > 500:
        return jsonify({"message": "Mesaj en fazla 500 karakter olabilir."}), 400

    # Günde 1 mesaj hakkı (Son 24 saat kontrolü)
    from models import UserMessage
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    existing_message = UserMessage.query.filter(
        UserMessage.user_id == user.id,
        UserMessage.timestamp >= one_day_ago
    ).first()

    if existing_message:
        return jsonify({"message": "Günde sadece 1 mesaj gönderme hakkınız vardır. Lütfen daha sonra tekrar deneyin."}), 400

    new_message = UserMessage(
        user_id=user.id,
        username=user.username,
        text=text
    )
    db.session.add(new_message)
    db.session.commit()

    return jsonify({"message": "Mesajınız başarıyla yöneticiye iletildi."}), 200
