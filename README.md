# snapchat_downloader
snapchat_downloader

# Setup after all is installed
- python manage.py makemigrations downloader
- python manage.py migrate
- python manage.py showmigrations
- python manage.py runserver

## Notes to do
- label to advertise that the app does not store any data after the job is done
- add buy me a coffee
- add a cool label
- make production ready by adding environment variables for secret key, debug setting, allowed_hosts (which needs to be the url)