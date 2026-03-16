# GitHub Folder Downloader Chrome Extension

This Chrome Extension allows you to easily download specific folders from any GitHub repository without cloning the entire repository. It achieves this entirely within your browser using the GitHub REST API and client-side ZIP compression.

## Features
- **Seamless Context Menu**: Simply right-click anywhere while browsing a GitHub folder to download it, avoiding any UI breakage when GitHub updates their site.
- **Fast and Efficient**: Uses GitHub's `git/trees` API to fetch folder structure recursively.
- **Smart Fetching**: Retrieves the file content directly from GitHub's raw CDN (`raw.githubusercontent.com`) to avoid burning through your API rate limit for file downloads.
- **Client-Side Compression**: Compresses files into a `.zip` archive on your browser using `JSZip` - no servers involved!
- **Progress UI**: A slick floating progress bar to tell you how far along the zip creation process is, especially useful for large repositories.

## Installation Instructions (Developer Mode)

Since this extension is locally developed, you need to load it unpacked into Chrome:

1. Clone or download this project folder onto your computer. Make sure you don't delete this folder, as Chrome runs the unpacked extension from this path.
2. Open Google Chrome and type `chrome://extensions/` in the URL bar and press Enter.
3. In the top right corner of the Extensions page, toggle **Developer mode** on.
4. Click on the **Load unpacked** button that appears in the top left corner.
5. Select the `github_folder_downloader_extensions` folder containing the `manifest.json`.
6. The extension is now successfully installed!

## Usage Instructions

1. Navigate to any repository on GitHub.
2. Click into the specific folder/directory you want to download.
3. Wait for the page to load the file list.
4. **Right-click** anywhere on the page to open the context menu.
5. Select **"Download GitHub Folder as Zip"**.
6. A floating progress bar will appear at the bottom right of your screen to show the download and compression progress.
7. Once finished, the ZIP file will automatically download to your computer.

## GitHub API Rate Limits & Token Configuration

**Why do I need a token?** 
By default, GitHub restricts unauthenticated API calls to **60 requests per hour**. Though this extension downloads file contents from the raw endpoints (saving bounds of API requests), it still needs to make API calls to fetch the directory structure recursively. If you download many folders an hour, you may run out of API limit capacity.

**How to configure a token:**
You can set a Personal Access Token (PAT) to increase your rate limit up to **5,000 requests per hour**. 

1. Go to Github's Token Creation Page: [https://github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Add a note like "GitHub Folder Downloader Extension".
3. You **DO NOT** need to check any of the permission scopes. It only needs public repository access, which is included by default.
4. Click **Generate token** (scroll to the bottom).
5. Copy the generated token (`ghp_...`).
6. Click on the extension icon in your Chrome toolbar.
7. Paste the token into the input field and click **Save Token**.

## Technical Stack
- **Manifest V3** compliant.
- **JSZip** library to create ZIP files interactively.
- Plain HTML/CSS/VanillaJS (`activeTab` and `storage` permissions).
