
class GmailXIntegration {
  constructor() {
    this.isInitialized = false;
    this.xFeedContainer = null;
    this.settings = {};
    this.init();
  }

  async init() {
    console.log('Gmail-X: Initializing...');
    
    await this.waitForGmailLoad();
    
    await this.loadSettings();
    
    if (this.settings.enabled) {
      this.injectXFeed();
      this.setupEventListeners();
      this.isInitialized = true;
      console.log('Gmail-X: Initialized successfully');
    }
  }

  async waitForGmailLoad() {
    return new Promise((resolve) => {
      const checkGmailLoad = () => {
        const gmailNav = document.querySelector('[role="navigation"]') || 
                        document.querySelector('[data-testid="sidebar"]') ||
                        document.querySelector('.nH.oy8Mbf'); // Gmail's main container
        
        if (gmailNav) {
          resolve();
        } else {
          setTimeout(checkGmailLoad, 1000);
        }
      };
      checkGmailLoad();
    });
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response.success) {
          this.settings = response.data;
        } else {
          this.settings = { enabled: true, maxTweets: 10 };
        }
        resolve();
      });
    });
  }

  injectXFeed() {
    const sidebar = this.findGmailSidebar();
    if (!sidebar) {
      console.warn('Gmail-X: Could not find Gmail sidebar');
      return;
    }

    this.xFeedContainer = this.createXFeedContainer();
    
    sidebar.appendChild(this.xFeedContainer);
    
    this.loadXContent();
  }

  findGmailSidebar() {
    const selectors = [
      '[role="navigation"]',
      '.nH.nn',
      '.nH.oy8Mbf .nH.nn',
      '[data-testid="sidebar"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    
    return null;
  }

  createXFeedContainer() {
    const container = document.createElement('div');
    container.id = 'gmail-x-feed';
    container.className = 'gmail-x-container';
    
    container.innerHTML = `
      <div class="gmail-x-header">
        <h3>X Feed</h3>
        <button id="gmail-x-refresh" class="gmail-x-refresh-btn">↻</button>
      </div>
      <div class="gmail-x-content">
        <div class="gmail-x-loading">Loading X content...</div>
      </div>
    `;
    
    return container;
  }

  async loadXContent() {
    if (!this.xFeedContainer) return;
    
    const contentDiv = this.xFeedContainer.querySelector('.gmail-x-content');
    contentDiv.innerHTML = '<div class="gmail-x-loading">Loading X content...</div>';
    
    try {
      const response = await this.fetchXData('/search', {
        query: 'technology OR programming OR javascript',
        max_results: this.settings.maxTweets || 10
      });
      
      if (response.success && response.data.data) {
        this.renderTweets(response.data.data, response.data.includes);
      } else {
        contentDiv.innerHTML = '<div class="gmail-x-error">Failed to load X content</div>';
      }
    } catch (error) {
      console.error('Gmail-X: Error loading content:', error);
      contentDiv.innerHTML = '<div class="gmail-x-error">Error loading X content</div>';
    }
  }

  async fetchXData(endpoint, params) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'fetchXData',
        endpoint,
        params
      }, resolve);
    });
  }

  renderTweets(tweets, includes) {
    const contentDiv = this.xFeedContainer.querySelector('.gmail-x-content');
    
    if (!tweets || tweets.length === 0) {
      contentDiv.innerHTML = '<div class="gmail-x-empty">No tweets found</div>';
      return;
    }
    
    const users = {};
    if (includes && includes.users) {
      includes.users.forEach(user => {
        users[user.id] = user;
      });
    }
    
    const tweetsHtml = tweets.map(tweet => {
      const author = users[tweet.author_id] || { username: 'unknown', name: 'Unknown User' };
      const createdAt = new Date(tweet.created_at).toLocaleDateString();
      
      return `
        <div class="gmail-x-tweet">
          <div class="gmail-x-tweet-header">
            <strong>${author.name}</strong>
            <span class="gmail-x-username">@${author.username}</span>
            <span class="gmail-x-date">${createdAt}</span>
          </div>
          <div class="gmail-x-tweet-content">
            ${tweet.text}
          </div>
          ${tweet.public_metrics ? `
            <div class="gmail-x-tweet-metrics">
              ♡ ${tweet.public_metrics.like_count} 
              ↻ ${tweet.public_metrics.retweet_count}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    contentDiv.innerHTML = tweetsHtml;
  }

  setupEventListeners() {
    const refreshBtn = this.xFeedContainer.querySelector('#gmail-x-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadXContent();
      });
    }
    
    if (this.settings.refreshInterval) {
      setInterval(() => {
        this.loadXContent();
      }, this.settings.refreshInterval);
    }
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'settingsUpdated') {
        this.settings = message.settings;
        if (this.settings.enabled) {
          this.loadXContent();
        } else {
          if (this.xFeedContainer) {
            this.xFeedContainer.style.display = 'none';
          }
        }
        sendResponse({ success: true });
      }
      
      if (message.action === 'refreshContent') {
        this.loadXContent();
        sendResponse({ success: true });
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GmailXIntegration();
  });
} else {
  new GmailXIntegration();
}
