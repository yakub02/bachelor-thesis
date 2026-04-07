"""
Entry point for RAVETURE Backend.
"""

import os
from app import create_app, db

app = create_app(os.getenv('FLASK_ENV', 'default'))

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5050))
    app.run(host='0.0.0.0', port=port, debug=True)
