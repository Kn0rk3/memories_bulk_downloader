// ============= Direct Download Implementation =============
class DownloadWorker {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.activeDownloads = 0;
        this.maxConcurrent = maxConcurrent;
        this.downloadDelay = 100;
        this.successCount = 0;
        this.failureCount = 0;
        this.errors = {};
    }

    async addToQueue(urls) {
        this.queue.push(...urls);
        this.processQueue();
    }

    async processQueue() {
        while (this.queue.length > 0 && this.activeDownloads < this.maxConcurrent) {
            this.activeDownloads++;
            const url = this.queue.shift();
            try {
                await this.downloadFile(url);
                this.successCount++;
                await new Promise(resolve => setTimeout(resolve, this.downloadDelay));
            } catch (error) {
                this.failureCount++;
                this.errors[error.message] = (this.errors[error.message] || 0) + 1;
                console.error(`Download failed: ${error.message}`);
            } finally {
                this.activeDownloads--;
                this.processQueue();
            }
        }
    }

    downloadFile(url) {
        return new Promise((resolve, reject) => {
            const parts = url.split("?");
            const xhttp = new XMLHttpRequest();
            xhttp.open("POST", parts[0], true);
            xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            
            xhttp.onreadystatechange = function () {
                if (xhttp.readyState == 4) {
                    if (xhttp.status === 403) {
                        reject(new Error('Link expired'));
                    } else if (xhttp.status !== 200) {
                        reject(new Error(`Failed with status ${xhttp.status}`));
                    } else {
                        try {
                            const mediaUrl = xhttp.responseText.trim();
                            if (!mediaUrl) {
                                reject(new Error('Empty media URL received'));
                                return;
                            }

                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            document.body.appendChild(iframe);
                            
                            const downloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            
                            iframe.contentWindow.document.write(`
                                <a id="${downloadId}" download href="${mediaUrl}">Download</a>
                                <script>
                                    var link = document.getElementById('${downloadId}');
                                    link.click();
                                    window.parent.postMessage('download-started', '*');
                                </script>
                            `);
                            
                            const cleanup = () => {
                                document.body.removeChild(iframe);
                                resolve(true);
                            };
                            
                            const messageHandler = (event) => {
                                if (event.data === 'download-started') {
                                    window.removeEventListener('message', messageHandler);
                                    setTimeout(cleanup, 1000);
                                }
                            };
                            
                            window.addEventListener('message', messageHandler);
                            
                            setTimeout(() => {
                                window.removeEventListener('message', messageHandler);
                                cleanup();
                            }, 2000);
                            
                        } catch (e) {
                            reject(new Error('Failed to process download'));
                        }
                    }
                }
            };
            
            xhttp.onerror = () => reject(new Error('Network error'));
            xhttp.ontimeout = () => reject(new Error('Request timed out'));
            
            try {
                xhttp.send(parts[1]);
            } catch (e) {
                reject(new Error('Failed to send request'));
            }
        });
    }
}

async function processDirectDownloads(selected_links, workerCount = 3) {
    const startTime = performance.now();
    let totalFiles = selected_links.length;
    let processedFiles = 0;
    
    let statusDiv = document.getElementById('downloadStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'downloadStatus';
        statusDiv.className = 'status';
        statusDiv.innerHTML = `
            <div class="status-text"></div>
            <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        `;
        document.querySelector('.download-options').insertAdjacentElement('afterend', statusDiv);
    }

    const updateStatus = () => {
        const percent = Math.round((processedFiles / totalFiles) * 100);
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        statusDiv.querySelector('.status-text').textContent = 
            `Processing: ${processedFiles}/${totalFiles} files (${percent}%) - Time: ${duration}s`;
        statusDiv.querySelector('.progress-bar').style.width = `${percent}%`;
    };
    updateStatus();

    const downloadWorker = new DownloadWorker(workerCount);
    const urls = [];

    for (const linkHtml of selected_links) {
        const linkElement = document.createElement('div');
        linkElement.innerHTML = linkHtml;
        const linkAnchor = linkElement.querySelector('a');
        
        if (linkAnchor) {
            const linkHref = linkAnchor.getAttribute('href');
            const url = linkHref.match(/downloadMemories\('(.+?)'\)/)[1];
            urls.push(url);
        }
    }

    const performanceLog = document.getElementById('performanceLog');
    performanceLog.style.display = 'block';
    
    const progressInterval = setInterval(() => {
        processedFiles = totalFiles - downloadWorker.queue.length - downloadWorker.activeDownloads;
        updateStatus();
        
        if (processedFiles === totalFiles) {
            clearInterval(progressInterval);
            const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
            const filesPerSecond = (totalFiles/totalDuration).toFixed(2);
            
            const successCount = downloadWorker.successCount;
            const failureCount = downloadWorker.failureCount;
            
            let statusMessage = `Downloads complete! Time: ${totalDuration}s. `;
            if (failureCount > 0) {
                statusMessage += `⚠️ ${failureCount} files failed to download.`;
                statusDiv.querySelector('.status-text').style.color = '#856404';
            } else {
                statusMessage += '✅ All files downloaded successfully!';
                statusDiv.querySelector('.status-text').style.color = '#155724';
            }
            
            statusDiv.querySelector('.status-text').textContent = statusMessage;
            statusDiv.querySelector('.progress-bar').style.width = '100%';
            
            const performanceDetails = document.getElementById('performanceDetails');
            performanceDetails.innerHTML = `
                <div class="download-summary">
                    <p>📊 Total files processed: ${totalFiles}</p>
                    <p>✅ Successfully downloaded: ${successCount}</p>
                    ${failureCount > 0 ? `<p>❌ Failed downloads: ${failureCount}</p>` : ''}
                    <p>⏱️ Total time: ${totalDuration} seconds</p>
                    <p>⚡ Average speed: ${filesPerSecond} files/second</p>
                    <p>🔄 Parallel downloads used: ${workerCount}</p>
                </div>
            `;
            
            if (failureCount > 0 && downloadWorker.errors) {
                const errorSummary = document.createElement('div');
                errorSummary.className = 'error-summary mt-4';
                
                const errorDetails = Object.entries(downloadWorker.errors)
                    .map(([error, count]) => `
                        <div class="error-item">
                            <span class="error-count badge bg-warning text-dark">${count}</span>
                            <span class="error-message">${error}</span>
                        </div>
                    `).join('');

                errorSummary.innerHTML = `
                    <div class="alert alert-warning">
                        <h5 class="alert-heading mb-3">⚠️ Download Failures</h5>
                        <div class="error-list mb-3">
                            ${errorDetails}
                        </div>
                        ${Object.keys(downloadWorker.errors).some(e => e.includes('expired')) ? 
                            `<div class="alert alert-info mb-0">
                                <small>📝 Note: Snapchat download links expire after 7 days. Please ensure you're using a recently exported HTML file.</small>
                            </div>` : ''
                        }
                    </div>
                `;

                performanceDetails.appendChild(errorSummary);
            }
        }
    }, 100);

    await downloadWorker.addToQueue(urls);
}

// ============= ZIP Download Implementation =============
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

async function processZipDownloads(selected_links) {
    const startTime = performance.now();
    let totalFiles = selected_links.length;
    let processedFiles = 0;
    
    let statusDiv = document.getElementById('downloadStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'downloadStatus';
        statusDiv.className = 'status';
        statusDiv.innerHTML = `
            <div class="status-text"></div>
            <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        `;
        document.querySelector('.download-options').insertAdjacentElement('afterend', statusDiv);
    }

    const updateStatus = () => {
        const percent = Math.round((processedFiles / totalFiles) * 100);
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        statusDiv.querySelector('.status-text').textContent = 
            `Processing: ${processedFiles}/${totalFiles} files (${percent}%) - Time: ${duration}s`;
        statusDiv.querySelector('.progress-bar').style.width = `${percent}%`;
    };
    updateStatus();

    const zips = new Map();
    const urls = [];

    // Prepare URLs
    for (const linkHtml of selected_links) {
        const linkElement = document.createElement('div');
        linkElement.innerHTML = linkHtml;
        const linkAnchor = linkElement.querySelector('a');
        
        if (linkAnchor) {
            const linkHref = linkAnchor.getAttribute('href');
            const url = linkHref.match(/downloadMemories\('(.+?)'\)/)[1];
            urls.push(url);
        }
    }

    statusDiv.querySelector('.status-text').textContent = `Starting download of ${totalFiles} files...`;
    statusDiv.querySelector('.progress-bar').style.width = '20%';

    // Process files in batches
    const response = await fetch('/batch-download/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ urls: urls })
    });

    const data = await response.json();
    if (data.success) {

        statusDiv.querySelector('.status-text').textContent = 'Processing downloaded files...';
        statusDiv.querySelector('.progress-bar').style.width = '80%';
            
        // Process results
        for (let i = 0; i < data.results.length; i++) {
            const result = data.results[i];
            if (result.success) {
                const yearMonth = selected_links[i].match(/data-yearmonth="([^"]+)"/)[1];
                const [year, month] = yearMonth.split('-');
                
                const zip = getOrCreateZip(year, month);
                const filename = `memory_${i + 1}${result.extension}`;
                zip.file(filename, result.content, { base64: true });
                processedFiles++;
                updateStatus();
            }
        }
    }

    function getOrCreateZip(year, month) {
        const key = `${year}-${month}`;
        if (!zips.has(key)) {
            zips.set(key, new JSZip());
        }
        return zips.get(key);
    }

    statusDiv.querySelector('.status-text').textContent = 'Creating ZIP files...';
    statusDiv.querySelector('.progress-bar').style.width = '100%';

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

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    const filesPerSecond = (totalFiles/totalDuration).toFixed(2);
    
    statusDiv.querySelector('.status-text').textContent = 'Download complete!';
    
    const performanceLog = document.getElementById('performanceLog');
    const performanceDetails = document.getElementById('performanceDetails');
    performanceLog.style.display = 'block';
    performanceDetails.innerHTML = `
        <p>📊 Total files processed: ${totalFiles}</p>
        <p>⏱️ Total time: ${totalDuration} seconds</p>
        <p>⚡ Average speed: ${filesPerSecond} files/second</p>
    `;
    
    setTimeout(() => statusDiv.remove(), 5000);
}

// ============= Common Utilities =============
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

// ============= Initialize Event Handlers =============
document.addEventListener('DOMContentLoaded', () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const firefoxWarning = document.querySelector('.firefox-warning');
    const edgeWarning = document.querySelector('.edge-warning');

    const directButton = document.getElementById('directDownloadButton');
    const workerCount = document.getElementById('workerCount');
    const workerCountDisplay = document.getElementById('workerCountDisplay');

    // More reliable Firefox detection
    const isFirefox = navigator.userAgent.includes('Firefox/');
    // Edge detection
    const isEdge = navigator.userAgent.includes('Edg/');

    if (isFirefox) {
        firefoxWarning.style.display = 'block';
        
        directButton.insertAdjacentHTML('afterend', 
            '<div style="color: #856404; font-size: 0.9em; margin-top: 5px;">' +
            '⚠️ Video downloads do not work in Firefox</div>'
        );
    }

    if (isEdge) {
        edgeWarning.style.display = 'block';
        
        directButton.insertAdjacentHTML('afterend', 
            '<div style="color: #856404; font-size: 0.9em; margin-top: 5px;">' +
            '⚠️ Direct downloads require Balanced or Basic tracking prevention</div>'
        );
    }

    // Update display when slider changes
    if (workerCount) {
        workerCount.addEventListener('input', function() {
            workerCountDisplay.textContent = this.value;
        });
    }

    directButton.onclick = async () => {
        directButton.disabled = true;
        try {
            const links = await getSelectedLinks();
            if (links) {
                await processDirectDownloads(links, parseInt(workerCount.value));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            directButton.disabled = false;
        }
    };
});