import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

import socket

def _get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

_local_ip = _get_local_ip()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'taraftaryum_super_gizli_anahtar_2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///soccer_social.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'taraftaryum_jwt_gizli_2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)

    # Mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'your_email@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'your_app_password')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'your_email@gmail.com')

    # Football API
    FOOTBALL_API_KEY = os.environ.get('FOOTBALL_API_KEY', '98c867f021d24b0296b1cb0a25f2b9e9')

    # Frontend URL (Resolve localhost/127.0.0.1 to actual local IP so external devices on WiFi can connect)
    _raw_frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:8081')
    FRONTEND_URL = _raw_frontend_url.replace('localhost', _local_ip).replace('127.0.0.1', _local_ip)

    # Cloudflare Turnstile
    TURNSTILE_SECRET_KEY = os.environ.get('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA')
