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
- current direct function works in firefox not - mp4 canot be decoded but in Edge it works
- in edge the tracking has to be ausgewogen to work - strict does not work but this is ok and something local. But we should note this on the page
- both options are now working in edge but are quite slow- both need to be parallizd if possible