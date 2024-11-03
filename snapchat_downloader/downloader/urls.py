from django.urls import path
from . import views

urlpatterns = [
    path('', views.upload_memory, name='upload_memory'),
    path('start-download/', views.initiate_download, name='start_download'),  # Ensure this name matches
    path('initiate-download/', views.initiate_download, name='initiate_download'),
    path('task-status/', views.task_status, name='task_status'),
]
