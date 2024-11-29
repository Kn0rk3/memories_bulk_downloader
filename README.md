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


## Notes to do

- date and time of the picture should be the correct one if possible
- remove batching if no longer needed
- check if the download can be done locally and not on the server - but this would mean to exclude the logic onto javascript again