let currentQuery = 'technology OR programming OR javascript';
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadContent();
});

function setupEventListeners() {
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadContent();
  });
  
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        currentQuery = query;
        loadContent();
      }
    }
  });
}

async function loadContent() {
  if (isLoading) return;
  
  isLoading = true;
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = '<div class="loading">Loading X content...</div>';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchXData',
      endpoint: '/search',
      params: {
        query: currentQuery,
        max_results: 20
      }
    });
    
    if (response.success && response.data.data) {
      renderTweets(response.data.data, response.data.includes);
    } else {
      contentDiv.innerHTML = '<div class="error">Failed to load X content</div>';
    }
  } catch (error) {
    console.error('Error loading content:', error);
    contentDiv.innerHTML = '<div class="error">Error loading X content</div>';
  } finally {
    isLoading = false;
  }
}

function renderTweets(tweets, includes) {
  const contentDiv = document.getElementById('content');
  
  if (!tweets || tweets.length === 0) {
    contentDiv.innerHTML = '<div class="empty">No tweets found</div>';
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
      <div class="tweet">
        <div class="tweet-header">
          <span class="tweet-author">${escapeHtml(author.name)}</span>
          <span class="tweet-username">@${escapeHtml(author.username)}</span>
          <span class="tweet-date">${createdAt}</span>
        </div>
        <div class="tweet-content">
          ${escapeHtml(tweet.text)}
        </div>
        ${tweet.public_metrics ? `
          <div class="tweet-metrics">
            <span>♡ ${tweet.public_metrics.like_count}</span>
            <span>↻ ${tweet.public_metrics.retweet_count}</span>
            <span>💬 ${tweet.public_metrics.reply_count}</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  contentDiv.innerHTML = tweetsHtml;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
