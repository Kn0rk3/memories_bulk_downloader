#!/bin/bash
cd /home/site/wwwroot

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn
gunicorn --bind=0.0.0.0 --timeout 600 snapchat_downloader.wsgi