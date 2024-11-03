from celery import shared_task

@shared_task
def download_memory_task(base_url, params, media_type, mid):
    # Import inside the function to avoid circular imports
    from .utils import download_memory_file
    result = download_memory_file(base_url, params, media_type, mid)
    return result