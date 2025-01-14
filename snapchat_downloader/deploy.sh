#!/bin/bash

# Create a temporary deployment directory
mkdir deploy_package
cd deploy_package

# Copy only the Django project files and folders
cp -r ../snapchat_downloader .
cp -r ../downloader .
cp ../manage.py .
cp ../requirements.txt .
cp ../startup.sh .

# Create the deployment zip
zip -r ../deploy.zip .

# Clean up
cd ..
rm -rf deploy_package