// Content script for GitHub Folder Downloader Extension

// Listen for context menu clicks from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadFolder") {
    // Only proceed if we are actually in a tree structure
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 5 && pathParts[2] === 'tree') {
      handleDownload();
    } else {
      showProgress("Error: Please right-click while inside a repository folder.", 0, true);
      setTimeout(hideProgress, 3000);
    }
  }
});

async function handleDownload(e) {
  if (e) e.preventDefault();
  
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const owner = pathParts[0];
  const repo = pathParts[1];
  
  let branch = "main";
  const branchBtn = document.querySelector('summary[data-hotkey="w"] span.css-truncate-target, button[id^="branch-picker"] span');
  if (branchBtn && branchBtn.textContent) {
    branch = branchBtn.textContent.trim();
  } else {
    // URL fallback assuming branch doesn't have slashes
    branch = pathParts[3];
  }

  // Calculate the target folder path within the repository
  const treeIndex = window.location.pathname.indexOf('/tree/' + branch);
  let targetFolder = "";
  if (treeIndex !== -1) {
    targetFolder = decodeURIComponent(window.location.pathname.substring(treeIndex + ('/tree/' + branch).length + 1));
  } else {
    // If branch parsing failed or branch name had slashes, find the intersection
    targetFolder = decodeURIComponent(pathParts.slice(4).join('/')); 
  }

  showProgress("Fetching folder structure from GitHub API...", 10);
  
  try {
    const tokenOptions = await chrome.storage.sync.get(['githubToken']);
    const token = tokenOptions.githubToken;
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Use GitHub API to get the full tree recursive
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const res = await fetch(apiUrl, { headers });
    
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        throw new Error(`API Error (${res.status}): Make sure you have API limits available or set a Token in the extension options. Branch might be incorrect if it has slashes.`);
      }
      throw new Error(`API Error: ${res.statusText}`);
    }
    
    const data = await res.json();
    if (data.truncated) {
      console.warn("Repository tree is too large, some files may be missing.");
    }
    
    // Filter to only get blobs (files) inside our target folder
    const filesToDownload = data.tree.filter(item => item.type === 'blob' && item.path.startsWith(targetFolder + '/'));
    
    if (filesToDownload.length === 0) {
      throw new Error("No files found in the specified folder. Is the folder empty?");
    }
    
    showProgress(`Found ${filesToDownload.length} files. Starting download...`, 20);
    
    // JSZip is globally available via injected script
    const zip = new JSZip();
    let downloadedCount = 0;
    
    const CONCURRENCY_LIMIT = 10;
    // Download chunks to avoid overwhelming the browser
    for (let i = 0; i < filesToDownload.length; i += CONCURRENCY_LIMIT) {
      const chunk = filesToDownload.slice(i, i + CONCURRENCY_LIMIT);
      
      const promises = chunk.map(async (file) => {
        // Use raw.githubusercontent to bypass API rate limits for the actual file contents
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
        try {
          // Token is technically not needed for public raw fetching, but good if the repo is private and token has access 
          // (NOTE: Private repo raw content actually requires token in a different way or passing via headers, applying here as safe measure)
          const fRes = await fetch(rawUrl, { headers });
          if (!fRes.ok) throw new Error("Fetch failed");
          
          const blob = await fRes.blob();
          const relativePath = file.path.substring(targetFolder.length + 1);
          zip.file(relativePath, blob);
          downloadedCount++;
          const percentage = 20 + Math.floor((downloadedCount / filesToDownload.length) * 60);
          showProgress(`Downloaded ${downloadedCount}/${filesToDownload.length} files...`, percentage);
        } catch (e) {
          console.error("Failed downloading file", file.path, e);
          zip.file(file.path.substring(targetFolder.length + 1) + ".error.txt", "Failed to download this file.");
        }
      });
      
      await Promise.all(promises);
    }
    
    showProgress("Compressing as ZIP file...", 90);
    
    const zipContent = await zip.generateAsync({ type: "blob" });
    
    showProgress("Done!", 100);
    
    // Trigger download
    const downloadUrl = URL.createObjectURL(zipContent);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${repo}-${targetFolder.split('/').pop() || 'folder'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    
    setTimeout(hideProgress, 3000);
    
  } catch (err) {
    console.error(err);
    showProgress(`Error: ${err.message}`, 0, true);
    setTimeout(hideProgress, 5000);
  }
}

function showProgress(message, percentage, isError = false) {
  let overlay = document.getElementById('gh-folder-download-progress');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gh-folder-download-progress';
    overlay.innerHTML = `
      <div class="gh-fd-header">
        <strong style="color:white;">GitHub Folder Downloader</strong>
        <button id="gh-fd-close" style="background:none; border:none; color:white; font-size:16px; cursor:pointer;" title="Close">×</button>
      </div>
      <div class="gh-fd-body">
        <div id="gh-fd-msg" style="margin-bottom:8px; font-size:13px; color:#c9d1d9;"></div>
        <div class="gh-fd-bar-container" style="background:#21262d; border-radius:4px; height:8px; overflow:hidden;">
          <div id="gh-fd-bar" style="background:#2ea043; width:0%; height:100%; transition:width 0.2s;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('gh-fd-close').onclick = hideProgress;
  }
  
  document.getElementById('gh-fd-msg').textContent = message;
  const bar = document.getElementById('gh-fd-bar');
  if (isError) {
    bar.style.background = '#f85149';
    bar.style.width = '100%';
    document.getElementById('gh-fd-msg').style.color = '#f85149';
  } else {
    bar.style.background = '#2ea043';
    bar.style.width = percentage + '%';
    document.getElementById('gh-fd-msg').style.color = '#c9d1d9';
  }
}

function hideProgress() {
  const overlay = document.getElementById('gh-folder-download-progress');
  if (overlay) {
    overlay.remove();
  }
}
