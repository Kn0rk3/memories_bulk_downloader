import os
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse, parse_qs
import timeit

start = timeit.default_timer()

# Directory to save downloaded memories
output_directory = "snapchat_memories"
os.makedirs(output_directory, exist_ok=True)

# Load the HTML file
with open("memories_history.html", "r", encoding="utf-8") as file:
    soup = BeautifulSoup(file, "html.parser")

# Find all <a> tags that call downloadMemories
links = soup.find_all("a", href=re.compile(r"javascript:downloadMemories"))

# Headers to mimic a real browser (you might need to update these)
headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
}

# Initialize a counter for the test limit
download_limit = 1000
counter = 0

# Process each link
for index, link in enumerate(links):
    if counter >= download_limit:
        break  # Stop after reaching the limit of 10 downloads

    match = re.search(r"downloadMemories\('(.+?)'\)", link["href"])
    if match:
        # Extract and parse the URL
        url = match.group(1)
        parsed_url = urlparse(url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
        query_params = parse_qs(parsed_url.query)

        # Convert query params into a form suitable for a POST request
        post_data = {key: value[0] for key, value in query_params.items()}
        
        # Step 1: Send the POST request to initiate the download
        response = requests.post(base_url, headers=headers, data=post_data)
        
        # Step 2: Check the response to retrieve the download link
        if response.status_code == 200 and response.text:
            # Assume the server responds with a direct URL for downloading the memory
            download_url = response.text.strip()
            
            # Step 3: Download the memory from the direct download URL
            download_response = requests.get(download_url, headers=headers)
            
            if download_response.status_code == 200:
                # Define filename and save the memory
                filename = f"memory_{index}.jpg"  # Adjust extension if needed
                file_path = os.path.join(output_directory, filename)
                
                with open(file_path, "wb") as memory_file:
                    memory_file.write(download_response.content)
                
                print(f"Downloaded memory {index + 1}: {filename}")
                counter += 1  # Increment counter after successful download
            else:
                print(f"Failed to download memory {index + 1}: Status {download_response.status_code}")
        else:
            print(f"Failed to retrieve download link for memory {index + 1}: Status {response.status_code}")

stop = timeit.default_timer()
print('Time: ', stop - start)  