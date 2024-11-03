import os
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse, parse_qs
from concurrent.futures import ThreadPoolExecutor, as_completed
import timeit
from datetime import datetime as dt
import psutil
from PIL import Image
import io

start = timeit.default_timer()

# Directory to save downloaded memories
output_directory = "snapchat_memories"
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

# Function to determine optimal worker count based on system load
def determine_worker_count():
    # Base worker count on logical cores
    cpu_cores = os.cpu_count()
    cpu_usage = psutil.cpu_percent(interval=1)
    memory_info = psutil.virtual_memory()
    memory_usage = memory_info.percent

    # Set min and max worker limits
    min_workers = max(1, cpu_cores // 2)
    max_workers = min(32, cpu_cores * 2)

    # Adjust worker count based on CPU and memory load
    if cpu_usage > 70 or memory_usage > 80:
        worker_count = min_workers
    elif cpu_usage < 40 and memory_usage < 60:
        worker_count = max_workers
    else:
        worker_count = cpu_cores

    print(f"Optimal worker count determined: {worker_count} (CPU: {cpu_usage}%, Memory: {memory_usage}%)")
    return worker_count

# Determine the optimal number of workers for this session
worker_count = determine_worker_count()

# Define the start and end indices for processing
start_index = 0    # Change this to start from a different index if needed
chunk_size = 100  # Number of links to process in this batch
end_index = min(start_index + chunk_size, len(links))  # Calculate end index based on chunk size

# Limit the number of downloads for testing
links = links[start_index:end_index]

# Update parse_metadata to take entry as input and parse locally within each thread
def parse_metadata(entry):
    date_time = entry.find_next("td").text.strip()  # Date and time
    media_type = entry.find_next("td").find_next("td").text.strip()  # Image or Video
    return date_time, media_type

# Update download_memory to call parse_metadata with individual entry
def download_memory(entry, index):
    date_time, media_type = parse_metadata(entry)  # Each thread gets its own entry

    match = re.search(r"downloadMemories\('(.+?)'\)", entry["href"])
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

    # Detect file type with Pillow
    file_content = download_response.content
    try:
        image = Image.open(io.BytesIO(file_content))
        file_extension = ".jpg" if image.format == "JPEG" else f".{image.format.lower()}"
    except (IOError, AttributeError):
        # Assume video if Pillow cannot open as an image
        file_extension = ".mp4"

    # Save the file with the correct extension
    filename = f"memory_{index + 1}{file_extension}"
    file_path = os.path.join(output_directory, filename)
    with open(file_path, "wb") as memory_file:
        memory_file.write(file_content)

    # Format the date_time string and set the file timestamps
    dt_obj = dt.strptime(date_time, "%Y-%m-%d %H:%M:%S UTC")
    timestamp = dt_obj.timestamp()

    # Apply the timestamp as the file's last modified and last access times
    os.utime(file_path, (timestamp, timestamp))

    return f"Downloaded memory {index + 1}: {filename}"

# Run downloads in parallel with a ThreadPoolExecutor
results = []
with ThreadPoolExecutor(max_workers=worker_count) as executor:
    # Pass each link directly to download_memory to ensure each thread works with its own entry
    future_to_index = {executor.submit(download_memory, entry, start_index + i): start_index + i for i, entry in enumerate(links)}

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