// ============= Direct Download Implementation =============
class DownloadWorker {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.activeDownloads = 0;
        this.maxConcurrent = maxConcurrent;
        this.downloadDelay = 100; // Add delay between downloads
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
                // Add delay between downloads
                await new Promise(resolve => setTimeout(resolve, this.downloadDelay));
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
                    if (xhttp.status == 200) {
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        document.body.appendChild(iframe);
                        
                        try {
                            // Create a unique ID for download link
                            const downloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            
                            iframe.contentWindow.document.write(`
                                <a id="${downloadId}" download href="${xhttp.responseText}">Download</a>
                                <script>
                                    var link = document.getElementById('${downloadId}');
                                    link.click();
                                    // Signal parent when download starts
                                    link.addEventListener('click', function() {
                                        window.parent.postMessage('download-started', '*');
                                    });
                                </script>
                            `);
                            
                            // Listen for download start
                            const cleanup = () => {
                                document.body.removeChild(iframe);
                                resolve(true);
                            };
                            
                            const messageHandler = (event) => {
                                if (event.data === 'download-started') {
                                    window.removeEventListener('message', messageHandler);
                                    // Give the download a chance to begin
                                    setTimeout(cleanup, 1000);
                                }
                            };
                            
                            window.addEventListener('message', messageHandler);
                            
                            // Fallback cleanup in case message never arrives
                            setTimeout(() => {
                                window.removeEventListener('message', messageHandler);
                                cleanup();
                            }, 2000);
                            
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
}

async function processDirectDownloads(selected_links, workerCount = 3) {
    const startTime = performance.now();
    let totalFiles = selected_links.length;
    let processedFiles = 0;
    
    /* let statusDiv = document.getElementById('downloadStatus');
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
    } */
    let statusDiv = document.getElementById('downloadStatus');

    const updateStatus = () => {
        const percent = Math.round((processedFiles / totalFiles) * 100);
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        statusDiv.querySelector('.status-text').textContent = 
            `Processing: ${processedFiles}/${totalFiles} files (${percent}%) - Time: ${duration}s - Using ${workerCount} parallel downloads`;
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

    /* const progressInterval = setInterval(() => {
        processedFiles = totalFiles - downloadWorker.queue.length - downloadWorker.activeDownloads;
        updateStatus();
        
        if (processedFiles === totalFiles) {
            clearInterval(progressInterval);
            const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
            const filesPerSecond = (totalFiles/totalDuration).toFixed(2);
            
            statusDiv.querySelector('.status-text').textContent = `Downloads complete! Total time: ${totalDuration} seconds`;
            statusDiv.querySelector('.progress-bar').style.width = '100%';
            
            const performanceLog = document.getElementById('performanceLog');
            const performanceDetails = document.getElementById('performanceDetails');
            performanceLog.style.display = 'block';
            performanceDetails.innerHTML = `
                <p>📊 Total files processed: ${totalFiles}</p>
                <p>⏱️ Total time: ${totalDuration} seconds</p>
                <p>⚡ Average speed: ${filesPerSecond} files/second</p>
                <p>🔄 Parallel downloads used: ${workerCount}</p>
            `;
            
            console.log('Download Performance Metrics:');
            console.log(`Total files processed: ${totalFiles}`);
            console.log(`Total time: ${totalDuration} seconds`);
            console.log(`Average speed: ${filesPerSecond} files/second`);
            console.log(`Parallel downloads used: ${workerCount}`);
            
            setTimeout(() => statusDiv.remove(), 5000);
        }
    }, 100); */
    const performanceLog = document.getElementById('performanceLog');
    performanceLog.style.display = 'block';
    
    const progressInterval = setInterval(() => {
        processedFiles = totalFiles - downloadWorker.queue.length - downloadWorker.activeDownloads;
        updateStatus();
        
        if (processedFiles === totalFiles) {
            clearInterval(progressInterval);
            const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
            const filesPerSecond = (totalFiles/totalDuration).toFixed(2);
            
            statusDiv.querySelector('.status-text').textContent = `Downloads complete! Total time: ${totalDuration} seconds`;
            statusDiv.querySelector('.progress-bar').style.width = '100%';
            
            const performanceDetails = document.getElementById('performanceDetails');
            performanceDetails.innerHTML = `
                <p>📊 Total files processed: ${totalFiles}</p>
                <p>⏱️ Total time: ${totalDuration} seconds</p>
                <p>⚡ Average speed: ${filesPerSecond} files/second</p>
                <p>🔄 Parallel downloads used: ${workerCount}</p>
            `;
            
            console.log('Download Performance Metrics:');
            console.log(`Total files processed: ${totalFiles}`);
            console.log(`Total time: ${totalDuration} seconds`);
            console.log(`Average speed: ${filesPerSecond} files/second`);
            console.log(`Parallel downloads used: ${workerCount}`);
            
            setTimeout(() => statusDiv.remove(), 5000);
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
    const warningDiv = document.querySelector('.browser-warning');
    const firefoxWarning = document.querySelector('.firefox-warning');
    const edgeWarning = document.querySelector('.edge-warning');

    const directButton = document.getElementById('directDownloadButton');
    const zipButton = document.getElementById('zipDownloadButton');
    const workerCount = document.getElementById('workerCount');
    const workerCountDisplay = document.getElementById('workerCountDisplay');

    // More reliable Firefox detection
    const isFirefox = navigator.userAgent.includes('Firefox/');
    // Edge detection
    const isEdge = navigator.userAgent.includes('Edg/');

    // currently the zip file feature is not enabled at this point because of legal reasons
    zipButton.insertAdjacentHTML('afterend', 
        '<div style="color: #856404; font-size: 0.9em; margin-top: 5px;">' +
        'This feature is not yet available.</div>'
    );

    if (isFirefox) {
        warningDiv.style.display = 'block';
        firefoxWarning.style.display = 'block';
        
        directButton.insertAdjacentHTML('afterend', 
            '<div style="color: #856404; font-size: 0.9em; margin-top: 5px;">' +
            '⚠️ Video downloads do not work in Firefox</div>'
        );
    }

    if (isEdge) {
        warningDiv.style.display = 'block';
        edgeWarning.style.display = 'block';
        
        directButton.insertAdjacentHTML('afterend', 
            '<div style="color: #856404; font-size: 0.9em; margin-top: 5px;">' +
            '⚠️ Direct downloads require Balanced or Basic tracking prevention</div>'
        );
    }

    // Hide warning div if no warnings are active
    if (firefoxWarning.style.display === 'none' && edgeWarning.style.display === 'none') {
        warningDiv.style.display = 'none';
    }

    // Update display when slider changes
    if (workerCount) {
        workerCount.addEventListener('input', function() {
            workerCountDisplay.textContent = this.value;
        });
    }

    directButton.onclick = async () => {
        directButton.disabled = true;
        //zipButton.disabled = true;
        try {
            const links = await getSelectedLinks();
            if (links) {
                await processDirectDownloads(links, parseInt(workerCount.value));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            directButton.disabled = false;
            //zipButton.disabled = true;
        }
    };

    zipButton.onclick = async () => {
        directButton.disabled = true;
        //zipButton.disabled = true;
        try {
            const links = await getSelectedLinks();
            if (links) {
                await processZipDownloads(links);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            directButton.disabled = false;
            //zipButton.disabled = true;
        }
    };
});