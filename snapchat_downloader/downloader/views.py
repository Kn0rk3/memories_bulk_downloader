from django.shortcuts import render
from django.template import loader
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import csrf_protect

import re
import json
import requests
from bs4 import BeautifulSoup
from PIL import Image
import io
import base64
import os
import psutil

""" def determine_worker_count():
    # Base worker count on logical cores
    cpu_cores = os.cpu_count()
    cpu_usage = psutil.cpu_percent(interval=1)
    memory_info = psutil.virtual_memory()
    memory_usage = memory_info.percent

    # More conservative limits
    min_workers = max(1, cpu_cores // 4)  # Using 1/4 of cores as minimum
    max_workers = min(16, cpu_cores)      # Using core count as maximum, capped at 16

    # Adjust worker count based on CPU and memory load
    if cpu_usage > 70 or memory_usage > 80:
        worker_count = min_workers
    elif cpu_usage < 40 and memory_usage < 60:
        worker_count = max_workers
    else:
        worker_count = cpu_cores // 2  # Using half of cores as default

    print(f"Optimal worker count determined: {worker_count} (CPU: {cpu_usage}%, Memory: {memory_usage}%)")
    return worker_count """

@csrf_protect
def upload(request):

    if request.method == 'POST' and request.FILES.get('html_file'):
        html_file = request.FILES['html_file']

        # Validate file type using both extension and content check
        if not html_file.name.endswith('.html'):
            return HttpResponse("Invalid file type. Only HTML files are allowed.", status=400)
        
        # Read a small chunk to check if it looks like HTML
        sample = html_file.read(1024).decode('utf-8').lower().strip()
        html_file.seek(0)  # Reset file pointer
        
        if not sample.startswith('<!doctype html') and not sample.startswith('<html'):
            return HttpResponse("Invalid file content. File must be valid HTML.", status=400)
        
        # Limit file size to 30MB
        file_size_limit = 30 * 1024 * 1024  # 30MB in bytes
        if html_file.size > file_size_limit:
            return HttpResponse("File size exceeds the limit of 30MB.", status=400)

        try:            
            # Parse the sanitized HTML with BeautifulSoup
            soup = BeautifulSoup(html_file, 'html.parser')       
            
            # Parse the HTML and extract the download links
            links = soup.find_all('a', href=re.compile(r'javascript:downloadMemories'))
            
            # Group the links by year and month
            grouped_links = {}
            for link in links:
                date_time_element = link.find_previous('td', text=re.compile(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC'))
                if date_time_element:
                    date_time = date_time_element.text.strip()
                    year, month = date_time[:4], date_time[5:7]
                    if year not in grouped_links:
                        grouped_links[year] = {}
                    if month not in grouped_links[year]:
                        grouped_links[year][month] = []
                    # Add data-yearmonth attribute to the link
                    grouped_links[year][month].append(f'<a href="{link["href"]}" data-yearmonth="{year}-{month}">{link.text}</a>')
                else:
                    print(f"Warning: Date and time not found for link: {link}")
            
            # Count the number of media files for each month
            links_count = {}
            for year, months in grouped_links.items():
                links_count[year] = {}
                for month, links in months.items():
                    links_count[year][month] = len(links)
            
            # Store the grouped_links and links_count in the session
            request.session['grouped_links'] = grouped_links
            request.session['links_count'] = links_count
            
            template = loader.get_template('downloader/download.html')
            context = {
                'links_count': links_count,
            }
            return HttpResponse(template.render(context, request))
    
        except Exception as e:
                return HttpResponse(f"Error parsing HTML file: {str(e)}", status=400)
    
    return render(request, 'downloader/upload.html')

@csrf_exempt
def download(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            selected_years = data.get('years', [])
            selected_months = data.get('months', [])
            
            grouped_links = request.session.get('grouped_links', {})
            selected_links = []
            
            for year_month in selected_months:
                year, month = year_month.split('-')
                if year in grouped_links and month in grouped_links[year]:
                    selected_links.extend(grouped_links[year][month])
            
            for year in selected_years:
                if year in grouped_links:
                    for month in grouped_links[year]:
                        selected_links.extend(grouped_links[year][month])
            
            total_links = len(selected_links)
            
            return JsonResponse({
                'selected_links': selected_links, 
                'total_links': total_links
            })
            
        except json.JSONDecodeError as e:
            return JsonResponse({
                'error': f'JSON decode error: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error': f'Server error: {str(e)}'
            }, status=500)
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt
def download_file(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            url = data.get('url')
            
            if not url:
                return JsonResponse({'success': False, 'error': 'URL is required'})
            
            def process_single_file(url):
                # Parse the URL and parameters
                url_parts = url.split('?')
                base_url = url_parts[0]
                params = url_parts[1] if len(url_parts) > 1 else ''
                
                # Get media URL
                response = requests.post(
                    base_url, 
                    data=params,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                
                if response.status_code == 200:
                    media_url = response.text.strip()
                    media_response = requests.get(media_url)
                    
                    if media_response.status_code == 200:
                        file_content = media_response.content
                        
                        try:
                            image = Image.open(io.BytesIO(file_content))
                            file_extension = ".jpg" if image.format == "JPEG" else f".{image.format.lower()}"
                        except (IOError, AttributeError):
                            file_extension = ".mov"
                        
                        return {
                            'success': True,
                            'content': base64.b64encode(file_content).decode('utf-8'),
                            'extension': file_extension
                        }
                
                return {'success': False, 'error': 'Download failed'}

            # Process single file
            result = process_single_file(url)
            return JsonResponse(result)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Server error: {str(e)}'
            })
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

'''
@csrf_exempt
def batch_download(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            urls = data.get('urls', [])
            
            if not urls:
                return JsonResponse({'success': False, 'error': 'URLs required'})

            worker_count = determine_worker_count()
            print(f"Processing {len(urls)} files with {worker_count} workers")
            
            results = []
            completed = 0
            total = len(urls)

            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures = [executor.submit(download_single_file, url) for url in urls]
                for future in as_completed(futures):
                    try:
                        result = future.result()
                        results.append(result)
                        completed += 1
                        if completed % 5 == 0:  # Log progress every 5 files
                            print(f"Progress: {completed}/{total} files processed")
                    except Exception as e:
                        results.append({
                            'success': False,
                            'error': str(e)
                        })
            
            return JsonResponse({
                'success': True,
                'results': results
            })
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Server error: {str(e)}'
            })
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def download_single_file(url):
    # Parse the URL and parameters
    url_parts = url.split('?')
    base_url = url_parts[0]
    params = url_parts[1] if len(url_parts) > 1 else ''
    
    # Get media URL
    response = requests.post(
        base_url, 
        data=params,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    if response.status_code == 200:
        media_url = response.text.strip()
        media_response = requests.get(media_url)
        
        if media_response.status_code == 200:
            file_content = media_response.content
            
            try:
                image = Image.open(io.BytesIO(file_content))
                file_extension = ".jpg" if image.format == "JPEG" else f".{image.format.lower()}"
            except (IOError, AttributeError):
                file_extension = ".mov"
            
            return {
                'success': True,
                'content': base64.b64encode(file_content).decode('utf-8'),
                'extension': file_extension
            }
    
    return {'success': False, 'error': 'Download failed'}
    '''