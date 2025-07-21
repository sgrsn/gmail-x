
const PROXY_SERVER_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchXData') {
    handleXApiRequest(request)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['xApiSettings'], (result) => {
      sendResponse({ success: true, data: result.xApiSettings || {} });
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ xApiSettings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

async function handleXApiRequest(request) {
  const { endpoint, params } = request;
  
  try {
    const url = new URL(`${PROXY_SERVER_URL}/api/x${endpoint}`);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('X API Request failed:', error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail-X extension installed');
  
  chrome.storage.sync.get(['xApiSettings'], (result) => {
    if (!result.xApiSettings) {
      chrome.storage.sync.set({
        xApiSettings: {
          enabled: true,
          refreshInterval: 300000, // 5 minutes
          maxTweets: 10,
          showInSidebar: true
        }
      });
    }
  });
});
