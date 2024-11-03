import re
from bs4 import BeautifulSoup
from datetime import datetime as dt
from urllib.parse import urlparse, parse_qs
import requests

def analyze_links(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        soup = BeautifulSoup(file, "html.parser")

    # Dictionary to hold the tree structure by year and month
    link_tree = {}
    links = soup.find_all("a", href=re.compile(r"javascript:downloadMemories"))

    for link in links:
        date_td = link.find_next("td")
        if date_td is None:
            continue

        date_text = date_td.text.strip()
        try:
            dt_obj = dt.strptime(date_text, "%Y-%m-%d %H:%M:%S UTC")
        except ValueError:
            continue

        year = dt_obj.strftime("%Y")
        month = dt_obj.strftime("%B")  # Full month name, e.g., "March"

        # Initialize year and month in the dictionary if not already present
        if year not in link_tree:
            link_tree[year] = {}
        if month not in link_tree[year]:
            link_tree[year][month] = 0

        # Increment the count for the respective month and year
        link_tree[year][month] += 1

    return link_tree

def download_memory_file(base_url, params, media_type, mid):
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
    }

    response = requests.post(base_url, data=params, headers=headers, stream=True)

    if response.status_code == 200:
        file_extension = ".jpg" if media_type.lower() == "image" else ".mp4"
        filename = f"{mid}{file_extension}"

        with open(filename, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)

        return filename
    else:
        raise Exception(f"Failed to download file: {response.status_code}")
    
def get_download_links_for_month(year, month):
    # This function should return a list of links matching the given year and month
    # Here’s a mock example. You’ll need to implement logic to filter the links by year/month.
    links = []  # Replace this with actual logic to retrieve links by year and month
    # Example structure:
    # links.append({
    #     "base_url": "https://example.com",
    #     "params": {"uid": ..., "sid": ..., "mid": ..., "ts": ..., "sig": ...},
    #     "media_type": "Image"
    # })
    return links

