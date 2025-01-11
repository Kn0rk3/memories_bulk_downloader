# bulk memory download
snapchat_downloader

# Setup after all is installed
- python manage.py makemigrations downloader
- python manage.py migrate
- python manage.py showmigrations
- python manage.py runserver

- change .env file for the local development