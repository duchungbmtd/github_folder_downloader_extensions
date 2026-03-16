// Background script for GitHub Folder Downloader

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "download-github-folder",
    title: "Download GitHub Folder as Zip",
    contexts: ["page"], // Show on right click anywhere on the page
    documentUrlPatterns: ["*://github.com/*/*/tree/*"] // Only show on GitHub tree urls
  });
  console.log("GitHub Folder Downloader installed and context menu created.");
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "download-github-folder") {
    // Send message to content script to start download
    chrome.tabs.sendMessage(tab.id, { action: "downloadFolder" });
  }
});
