from django.shortcuts import render
from .forms import MemoryUploadForm
from .tasks import download_memory_task
from celery.result import AsyncResult
from .utils import analyze_links
from django.http import JsonResponse

def upload_memory(request):
    if request.method == 'POST':
        form = MemoryUploadForm(request.POST, request.FILES)
        if form.is_valid():
            memory_upload = form.save()
            file_path = memory_upload.file.path
            link_tree = analyze_links(file_path)
            return render(request, 'downloader/analyze.html', {'link_tree': link_tree})
    else:
        form = MemoryUploadForm()
    return render(request, 'downloader/upload.html', {'form': form})

def initiate_download(request):
    base_url = request.GET.get("base_url")
    uid = request.GET.get("uid")
    sid = request.GET.get("sid")
    mid = request.GET.get("mid")
    ts = request.GET.get("ts")
    sig = request.GET.get("sig")
    media_type = request.GET.get("media_type", "video")

    params = {
        "uid": uid,
        "sid": sid,
        "mid": mid,
        "ts": ts,
        "sig": sig
    }

    task = download_memory_task.delay(base_url, params, media_type, mid)
    return render(request, 'downloader/download_status.html', {'task_id': task.id})

def task_status(request):
    task_id = request.GET.get('task_id')
    task = AsyncResult(task_id)
    return JsonResponse({'status': task.status})

@csrf_exempt
def start_bulk_download(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        selected_months = data.get('selectedMonths', [])
        
        for month_data in selected_months:
            year = month_data.get('year')
            month = month_data.get('month')
            
            # Fetch all download links for the given year and month
            download_links = get_download_links_for_month(year, month)
            
            # Trigger a download task for each link in the selected month
            for link in download_links:
                base_url = link['base_url']
                params = link['params']
                media_type = link['media_type']
                mid = link['params']['mid']
                download_memory_task.delay(base_url, params, media_type, mid)

        return JsonResponse({"message": "Download tasks have been initiated for the selected months."})
    return JsonResponse({"error": "Invalid request method."}, status=400)
