import os
import ssl
from app import create_app, db

app = create_app(os.getenv('FLASK_ENV', 'default'))

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    cert_file = os.getenv('TLS_CERT_FILE')
    key_file = os.getenv('TLS_KEY_FILE')

    if cert_file and key_file:
        # Produkční HTTPS — TLS 1.2+ povinné, TLS 1.0/1.1 zakázáno
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
        ssl_context.load_cert_chain(cert_file, key_file)
        app.run(host='0.0.0.0', port=port, ssl_context=ssl_context)
    else:
        # Development — bez TLS
        app.run(host='0.0.0.0', port=port, debug=True)