// Global variables
let isInitialized = false;

// Check login status when extension starts
chrome.runtime.onStartup.addListener(function() {
  // Reset login status when browser starts
  chrome.storage.sync.set({ isLoggedIn: false });
  checkAllTabs();
});

// Check login status when browser starts
chrome.runtime.onInstalled.addListener(function() {
  // Initialize sync data if needed
  chrome.storage.sync.get(['isFirstRun'], function(result) {
    if (result.isFirstRun === undefined) {
      chrome.storage.sync.set({
        isFirstRun: false,
        password: 'Au',
        isLoggedIn: false
      });
    }
    isInitialized = true;
    checkAllTabs();
  });
});

// Handle window close event - log out when browser is closed
chrome.windows.onRemoved.addListener(function(windowId) {
  chrome.windows.getAll(function(windows) {
    if (windows.length === 0) {
      // All windows closed, log out
      chrome.storage.sync.set({ isLoggedIn: false });
    }
  });
});

// Block all navigation until logged in
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // Only block main frame navigations (not iframes, etc)
  if (details.frameId === 0) {
    blockIfNotLoggedIn(details.tabId, details.url);
  }
}, {url: [{schemes: ['http', 'https']}]});

// Block new tab creation
chrome.tabs.onCreated.addListener(function(tab) {
  blockIfNotLoggedIn(tab.id, tab.url || '');
});

// Block tab switching
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab) {
      blockIfNotLoggedIn(tab.id, tab.url || '');
    }
  });
});

// Block tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    blockIfNotLoggedIn(tabId, changeInfo.url);
  }
});

function checkAllTabs() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      blockIfNotLoggedIn(tab.id, tab.url || '');
    });
  });
}

function blockIfNotLoggedIn(tabId, url) {
  // Skip blocking for extension pages and chrome:// URLs
  if (!isInitialized || 
      url.startsWith(chrome.runtime.getURL('')) || 
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://')) {
    return;
  }

  chrome.storage.sync.get(['isLoggedIn'], function(result) {
    if (!result.isLoggedIn) {
      redirectToLoginPage(tabId);
    }
  });
}

function redirectToLoginPage(tabId) {
  chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL('popup.html')
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "checkLogin") {
    chrome.storage.sync.get(['isLoggedIn'], function(result) {
      sendResponse({isLoggedIn: result.isLoggedIn});
    });
    return true;
  } else if (request.action === "loginSuccess") {
    // When login is successful, allow all tabs to navigate
    checkAllTabs();
    sendResponse({status: "success"});
    return true;
  }
}); 