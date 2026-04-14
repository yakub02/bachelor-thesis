import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration with security defaults."""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY must be set")
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY must be set")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # QR Signing
    QR_SIGNING_KEY = os.getenv('QR_SIGNING_KEY')
    if not QR_SIGNING_KEY:
        raise ValueError("QR_SIGNING_KEY must be set")
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL must be set")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,  # Check connection health
        'pool_recycle': 300,    # Recycle connections every 5 min
    }
    
    # Security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    
    # Rate limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_DEFAULT = "100 per minute"
    RATELIMIT_STORAGE_URL = "memory://"
    
    # Order settings
    ORDER_EXPIRATION_MINUTES = 15
    MAX_ITEMS_PER_ORDER = 10

    # Flask-Mail
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@raveture.cz')

    # GoPay Payment Gateway
    GOPAY_CLIENT_ID = os.getenv('GOPAY_CLIENT_ID')
    GOPAY_CLIENT_SECRET = os.getenv('GOPAY_CLIENT_SECRET')
    GOPAY_GOID = os.getenv('GOPAY_GOID')
    GOPAY_GATEWAY_URL = os.getenv('GOPAY_GATEWAY_URL', 'https://gw.sandbox.gopay.com')
    GOPAY_RETURN_URL = os.getenv('GOPAY_RETURN_URL', 'http://localhost:5001/api/v1/payments/callback')
    GOPAY_NOTIFICATION_URL = os.getenv('GOPAY_NOTIFICATION_URL', 'http://localhost:5001/api/v1/payments/webhook')


class DevelopmentConfig(Config):
    """Development - relaxed but still secure."""
    DEBUG = True
    SESSION_COOKIE_SECURE = False  # Allow HTTP in dev

    # Allow missing keys in dev with defaults
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-me')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-key-change-me')
    QR_SIGNING_KEY = os.getenv('QR_SIGNING_KEY', 'dev-qr-key-change-me')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:root@localhost:5432/ticketing_db')


class ProductionConfig(Config):
    """Production - full security."""
    DEBUG = False

    # Stricter rate limits in production
    RATELIMIT_DEFAULT = "60 per minute"

    # TLS — cesty k certifikátu a klíči (nastavit v prostředí)
    TLS_CERT_FILE = os.getenv('TLS_CERT_FILE')  # např. /etc/ssl/certs/raveture.crt
    TLS_KEY_FILE = os.getenv('TLS_KEY_FILE')    # např. /etc/ssl/private/raveture.key

    # Vynutit HTTPS schéma pro generování URL
    PREFERRED_URL_SCHEME = 'https'

    # HSTS — informuje prohlížeče, že web běží výhradně přes HTTPS
    HSTS_MAX_AGE = 31536000  # 1 rok v sekundách


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-key'
    QR_SIGNING_KEY = 'test-qr-key'


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}