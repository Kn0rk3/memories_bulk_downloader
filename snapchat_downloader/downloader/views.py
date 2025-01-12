import logging  
from django.shortcuts import render
from django.template import loader
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_protect
from django.conf import settings

import re
import json
from bs4 import BeautifulSoup

# Get a logger instance
logger = logging.getLogger(__name__)

@csrf_protect
def upload(request):
    context = {
        'app_title': settings.APP_TITLE,
        'github_url': settings.GITHUB_URL,
        'coffee_url': settings.COFFEE_URL
    }

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
        
        # Limit file size 
        file_size_limit = settings.MAX_UPLOAD_SIZE
        if html_file.size > file_size_limit:
            mb = file_size_limit / 1024 / 1024
            return HttpResponse("File size exceeds the limit of " + str(mb) +"MB.", status=400)

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

            # Logging 
            total_links = 0
            for year, months in links_count.items():
                for month, count in months.items():
                    logger.info(
                        f"Processed {count} links for {year}-{month}",  
                        extra={
                            'year': year,
                            'month': month,
                            'link_count': count
                        }
                    )
                    total_links += count

            logger.info(f"Total links processed: {total_links}")
            
            template = loader.get_template('downloader/download.html')
            context = {
                'links_count': links_count,
                'app_title': settings.APP_TITLE,
                'github_url': settings.GITHUB_URL,
                'coffee_url': settings.COFFEE_URL
            }
            return HttpResponse(template.render(context, request))
    
        except Exception as e:
                return HttpResponse(f"Error parsing HTML file: {str(e)}", status=400)
    
    return render(request, 'downloader/upload.html', context)

@csrf_protect
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