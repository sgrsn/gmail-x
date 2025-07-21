document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkConnection();
  setupEventListeners();
});

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      const settings = response.data;
      
      document.getElementById('enabled').checked = settings.enabled !== false;
      document.getElementById('maxTweets').value = settings.maxTweets || 10;
      document.getElementById('refreshInterval').value = (settings.refreshInterval || 300000) / 60000;
      document.getElementById('showInSidebar').checked = settings.showInSidebar !== false;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function checkConnection() {
  const statusDiv = document.getElementById('status');
  
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      statusDiv.textContent = 'Connected to proxy server';
      statusDiv.className = 'status connected';
    } else {
      throw new Error('Server responded with error');
    }
  } catch (error) {
    statusDiv.textContent = 'Proxy server not running';
    statusDiv.className = 'status disconnected';
  }
}

function setupEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('refreshBtn').addEventListener('click', refreshContent);
}

async function saveSettings() {
  const settings = {
    enabled: document.getElementById('enabled').checked,
    maxTweets: parseInt(document.getElementById('maxTweets').value),
    refreshInterval: parseInt(document.getElementById('refreshInterval').value) * 60000,
    showInSidebar: document.getElementById('showInSidebar').checked
  };
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'saveSettings', 
      settings 
    });
    
    if (response.success) {
      const saveBtn = document.getElementById('saveBtn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      saveBtn.style.backgroundColor = '#137333';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '#1a73e8';
      }, 1500);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('mail.google.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'settingsUpdated', settings });
        }
      });
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Failed to save settings. Please try again.');
  }
}

async function refreshContent() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('mail.google.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshContent' });
        
        const refreshBtn = document.getElementById('refreshBtn');
        const originalText = refreshBtn.textContent;
        refreshBtn.textContent = 'Refreshed!';
        
        setTimeout(() => {
          refreshBtn.textContent = originalText;
        }, 1500);
      }
    });
  } catch (error) {
    console.error('Failed to refresh content:', error);
  }
}
