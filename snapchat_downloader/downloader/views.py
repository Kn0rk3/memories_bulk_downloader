from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.template import loader
from bs4 import BeautifulSoup
import re

def upload(request):
    if request.method == 'POST' and request.FILES['html_file']:
        html_file = request.FILES['html_file']
        soup = BeautifulSoup(html_file, 'html.parser')
        
        # Parse the HTML and extract the download links
        links = soup.find_all('a', href=re.compile(r'javascript:downloadMemories'))
        
        # Group the links by year and month
        grouped_links = {}
        for link in links:
            date_time_element = link.find_next('td')
            if date_time_element:
                date_time = date_time_element.text.strip()
                year, month = date_time[:4], date_time[5:7]
                if year not in grouped_links:
                    grouped_links[year] = {}
                if month not in grouped_links[year]:
                    grouped_links[year][month] = []
                grouped_links[year][month].append(str(link))
            else:
                print(f"Warning: Date and time not found for link: {link}")
        
        # Store the grouped links in the session
        request.session['grouped_links'] = grouped_links
        
        # Redirect to the download page
        return redirect('download')
    
    return render(request, 'downloader/upload.html')

def download(request):
    # Render the download.html template with the grouped links
    template = loader.get_template('downloader/download.html')
    context = {'grouped_links': request.session.get('grouped_links', {})}
    return HttpResponse(template.render(context, request))