# snapchat_downloader
snapchat_downloader

# start redis in one bash
- sudo systemctl start redis
- sudo systemctl status redis
- sudo systemctl stop redis

# start celery in another bash
- navigate into the snapchat_downloader folder with manage.py file
- celery -A snapchat_downloader worker -l info

# Setup after all is installed
- python manage.py makemigrations downloader
- python manage.py migrate
- python manage.py showmigrations
- python manage.py runserver
