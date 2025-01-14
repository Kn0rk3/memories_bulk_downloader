import logging
import os
from .settings import *

logger = logging.getLogger(__name__)
logger.info("Loading production settings")

DEBUG = False

# Clear any ALLOWED_HOSTS from base settings
ALLOWED_HOSTS = ['.azurewebsites.net']
if os.environ.get('WEBSITE_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ.get('WEBSITE_HOSTNAME'))

logger.info(f"Production ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# CSRF Settings
CSRF_TRUSTED_ORIGINS = [
    'https://memories-bulk-downloader.azurewebsites.net',
]

# Add whitenoise middleware for static files
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Enhanced logging for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}