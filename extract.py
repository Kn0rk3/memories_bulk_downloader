import os
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse, parse_qs
from concurrent.futures import ThreadPoolExecutor, as_completed
import timeit
import imghdr

start = timeit.default_timer()

# Directory to save downloaded memories
output_directory = "snapchat_memories_1"
os.makedirs(output_directory, exist_ok=True)

# Load the HTML file
with open("memories_history.html", "r", encoding="utf-8") as file:
    soup = BeautifulSoup(file, "html.parser")

# Find all <a> tags that call downloadMemories
links = soup.find_all("a", href=re.compile(r"javascript:downloadMemories"))

# Headers to mimic a real browser
headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
}

# Define the start and end indices for processing
start_index = 501   # Change this to start from a different index if needed
chunk_size = 70000  # Number of links to process in this batch
end_index = min(start_index + chunk_size, len(links))  # Calculate end index based on chunk size

# Limit the number of downloads for testing
links = links[start_index:end_index]

# Function to handle each download
def download_memory(link, index):
    match = re.search(r"downloadMemories\('(.+?)'\)", link["href"])
    if not match:
        return f"Memory {index + 1}: Invalid link"

    # Extract and parse the URL
    url = match.group(1)
    parsed_url = urlparse(url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
    query_params = parse_qs(parsed_url.query)

    # Convert query params into form for a POST request
    post_data = {key: value[0] for key, value in query_params.items()}

    # Step 1: Send the POST request to get the download link
    response = requests.post(base_url, headers=headers, data=post_data)
    if response.status_code != 200 or not response.text:
        return f"Memory {index + 1}: Failed to retrieve download link, Status {response.status_code}"

    # Assume the response text is a direct URL for downloading
    download_url = response.text.strip()

    # Step 2: Download the memory from the direct download URL
    download_response = requests.get(download_url, headers=headers)
    if download_response.status_code != 200:
        return f"Memory {index + 1}: Failed to download, Status {download_response.status_code}"

    # Step 3: Check file type with imghdr for images
    file_extension = ".mp4"  # Default to video
    file_content = download_response.content

    # Use imghdr to detect image type, if any
    if imghdr.what(None, file_content):
        file_extension = ".jpg"

    # Save the file with the correct extension
    filename = f"memory_{index + 1}{file_extension}"
    file_path = os.path.join(output_directory, filename)
    with open(file_path, "wb") as memory_file:
        memory_file.write(download_response.content)

    return f"Downloaded memory {index + 1}: {filename}"

# Run downloads in parallel with a ThreadPoolExecutor
results = []
with ThreadPoolExecutor(max_workers=12) as executor:
    # Map each link to the download_memory function, adjusting index based on start_index
    future_to_index = {executor.submit(download_memory, link, start_index + i): start_index + i for i, link in enumerate(links)}

    for future in as_completed(future_to_index):
        try:
            result = future.result()
            results.append(result)
            print(result)
        except Exception as e:
            print(f"An error occurred: {e}")

# Optionally, write results to a log file
with open("download_log.txt", "w") as log_file:
    for result in results:
        log_file.write(result + "\n")

stop = timeit.default_timer()
print('Time: ', stop - start)
