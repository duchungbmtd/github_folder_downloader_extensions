// Load saved token if any
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['githubToken'], (result) => {
    if (result.githubToken) {
      document.getElementById('gh-token').value = result.githubToken;
    }
  });

  // Save token on button click
  document.getElementById('save-btn').addEventListener('click', () => {
    const token = document.getElementById('gh-token').value.trim();
    
    chrome.storage.sync.set({ githubToken: token }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Token saved successfully!';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    });
  });
});
