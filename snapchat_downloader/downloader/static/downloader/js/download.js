// Direct download function (Snapchat's approach)
function directDownloadMemory(url) {
    return new Promise((resolve, reject) => {
        const parts = url.split("?");
        const xhttp = new XMLHttpRequest();
        xhttp.open("POST", parts[0], true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    // Create hidden iframe for download
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                    
                    try {
                        // Write a download link into the iframe and click it
                        iframe.contentWindow.document.write(`
                            <a id="download" download href="${xhttp.responseText}">Download</a>
                            <script>
                                document.getElementById('download').click();
                            </script>
                        `);
                        
                        // Remove the iframe after a short delay
                        setTimeout(() => {
                            document.body.removeChild(iframe);
                        }, 1000);
                        
                        resolve(true);
                    } catch (e) {
                        document.body.removeChild(iframe);
                        reject(e);
                    }
                } else {
                    reject(new Error('Failed to get CDN URL'));
                }
            }
        };
        
        xhttp.send(parts[1]);
    });
}


// Server-proxied download function for ZIP creation
async function downloadMemory(url) {
    try {
        const response = await fetch('/download-file/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ url: url })
        });

        const data = await response.json();
        if (data.success) {
            return {
                content: data.content,
                extension: data.extension
            };
        } else {
            console.error('Download failed:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}


// Function to process direct downloads
async function processDirectDownloads(selected_links) {
    let totalFiles = selected_links.length;
    let processedFiles = 0;
    
    let statusDiv = document.getElementById('downloadStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'downloadStatus';
        statusDiv.className = 'status';
        document.querySelector('.download-list').appendChild(statusDiv);
    }

    const updateStatus = () => {
        const percent = Math.round((processedFiles / totalFiles) * 100);
        statusDiv.textContent = `Processing: ${processedFiles}/${totalFiles} files (${percent}%)`;
    };
    updateStatus();

    for (const linkHtml of selected_links) {
        const linkElement = document.createElement('div');
        linkElement.innerHTML = linkHtml;
        const linkAnchor = linkElement.querySelector('a');
        
        if (linkAnchor) {
            const linkHref = linkAnchor.getAttribute('href');
            const url = linkHref.match(/downloadMemories\('(.+?)'\)/)[1];
            
            try {
                await directDownloadMemory(url);
                processedFiles++;
                updateStatus();
                // Add small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Download failed:', error);
            }
        }
    }

    statusDiv.textContent = 'Downloads complete!';
    setTimeout(() => statusDiv.remove(), 5000);
}

// Function to process ZIP downloads
async function processZipDownloads(selected_links) {
    let totalFiles = selected_links.length;
    let processedFiles = 0;
    
    let statusDiv = document.getElementById('downloadStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'downloadStatus';
        statusDiv.className = 'status';
        document.querySelector('.download-list').appendChild(statusDiv);
    }

    const updateStatus = () => {
        const percent = Math.round((processedFiles / totalFiles) * 100);
        statusDiv.textContent = `Processing: ${processedFiles}/${totalFiles} files (${percent}%)`;
    };
    updateStatus();

    const zips = new Map();

    function getOrCreateZip(year, month) {
        const key = `${year}-${month}`;
        if (!zips.has(key)) {
            zips.set(key, new JSZip());
        }
        return zips.get(key);
    }

    for (const [index, linkHtml] of selected_links.entries()) {
        const linkElement = document.createElement('div');
        linkElement.innerHTML = linkHtml;
        const linkAnchor = linkElement.querySelector('a');
        
        if (linkAnchor) {
            const linkHref = linkAnchor.getAttribute('href');
            const url = linkHref.match(/downloadMemories\('(.+?)'\)/)[1];
            const yearMonth = linkAnchor.getAttribute('data-yearmonth');
            
            if (yearMonth) {
                const [year, month] = yearMonth.split('-');
                try {
                    const response = await downloadMemory(url);
                    if (response) {
                        const zip = getOrCreateZip(year, month);
                        const filename = `memory_${index + 1}${response.extension}`;
                        zip.file(filename, response.content, { base64: true });
                        processedFiles++;
                        updateStatus();
                    }
                } catch (error) {
                    console.error('Download failed:', error);
                }
            }
        }
    }

    // Create ZIP files
    statusDiv.textContent = 'Creating ZIP files...';
    for (const [yearMonth, zip] of zips) {
        const [year, month] = yearMonth.split('-');
        try {
            const content = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `snapchat_memories_${year}_${month}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(`Error creating zip for ${year}-${month}:`, error);
        }
    }
    
    statusDiv.textContent = 'Download complete!';
    setTimeout(() => statusDiv.remove(), 5000);
}

// Function to get selected links from server
async function getSelectedLinks() {
    const selectedYears = Array.from(document.querySelectorAll('input[name="selected_years"]:checked'))
        .map(checkbox => checkbox.value);
    const selectedMonths = Array.from(document.querySelectorAll('input[name="selected_months"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedYears.length === 0 && selectedMonths.length === 0) {
        alert('Please select at least one year or month to download');
        return null;
    }

    const response = await fetch('/download/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
            years: selectedYears,
            months: selectedMonths
        })
    });
    
    const data = await response.json();
    return data.selected_links;
}

// Initialize buttons when page loads
document.addEventListener('DOMContentLoaded', () => {
    const directButton = document.getElementById('directDownloadButton');
    const zipButton = document.getElementById('zipDownloadButton');

    directButton.onclick = async () => {
        directButton.disabled = true;
        zipButton.disabled = true;
        try {
            const links = await getSelectedLinks();
            if (links) {
                await processDirectDownloads(links);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            directButton.disabled = false;
            zipButton.disabled = false;
        }
    };

    zipButton.onclick = async () => {
        directButton.disabled = true;
        zipButton.disabled = true;
        try {
            const links = await getSelectedLinks();
            if (links) {
                await processZipDownloads(links);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            directButton.disabled = false;
            zipButton.disabled = false;
        }
    };
});
