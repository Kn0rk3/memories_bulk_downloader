from django.shortcuts import render
from django.template import loader
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import re
import json
import requests
from bs4 import BeautifulSoup
from PIL import Image
import io
import base64

def upload(request):
    if request.method == 'POST' and request.FILES.get('html_file'):
        html_file = request.FILES['html_file']
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
    
    return render(request, 'downloader/upload.html')

@csrf_exempt
def download(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            selected_years = data.get('years', [])
            selected_months = data.get('months', [])
            offset = data.get('offset', 0)
            limit = data.get('limit', 100)
            
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
            selected_links = selected_links[offset:offset+limit]
            
            return JsonResponse({'selected_links': selected_links, 'total_links': total_links})
        except json.JSONDecodeError as e:
            return JsonResponse({'error': f'JSON decode error: {str(e)}'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt
def download_file(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            url = data.get('url')
            
            if not url:
                return JsonResponse({'success': False, 'error': 'URL is required'})
            
            # Parse the URL and parameters
            url_parts = url.split('?')
            base_url = url_parts[0]
            params = url_parts[1] if len(url_parts) > 1 else ''
            
            # First request to get the media URL
            response = requests.post(
                base_url, 
                data=params,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code == 200:
                # Get the media URL from response
                media_url = response.text.strip()
                
                # Second request to get the actual media content
                media_response = requests.get(media_url)
                
                if media_response.status_code == 200:
                    file_content = media_response.content
                    
                    # Detect file type using Pillow
                    try:
                        image = Image.open(io.BytesIO(file_content))
                        file_extension = ".jpg" if image.format == "JPEG" else f".{image.format.lower()}"
                    except (IOError, AttributeError):
                        # If Pillow cannot open it as an image, assume it's a video
                        file_extension = ".mov"
                    
                    # Convert binary content to base64
                    content_b64 = base64.b64encode(file_content).decode('utf-8')
                    
                    return JsonResponse({
                        'success': True,
                        'content': content_b64,
                        'extension': file_extension
                    })
                else:
                    return JsonResponse({
                        'success': False,
                        'error': f'Failed to download media: {media_response.status_code}'
                    })
            else:
                return JsonResponse({
                    'success': False,
                    'error': f'Failed to get media URL: {response.status_code}'
                })
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Server error: {str(e)}'
            })
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)