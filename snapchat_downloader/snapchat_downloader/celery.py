from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snapchat_downloader.settings')

# Create the Celery application
app = Celery('snapchat_downloader')

# Configure Celery to use settings from Django's settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodiscover tasks from all installed Django apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')