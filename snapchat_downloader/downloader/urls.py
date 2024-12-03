from django.urls import path
from . import views

urlpatterns = [
    path('', views.upload, name='upload'),
    path('download/', views.download, name='download'),
    path('download-file/', views.download_file, name='download-file'),
    path('batch-download/', views.batch_download, name='batch_download'),
]