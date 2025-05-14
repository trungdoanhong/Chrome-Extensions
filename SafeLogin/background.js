// Check login status when extension starts
chrome.runtime.onStartup.addListener(function() {
  checkAllTabs();
  // Reset login status when browser starts
  chrome.storage.sync.set({ isLoggedIn: false });
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
  });
  checkAllTabs();
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
  checkLoginStatus(details.tabId);
}, {url: [{schemes: ['http', 'https']}]});

// Block new tab creation
chrome.tabs.onCreated.addListener(function(tab) {
  checkLoginStatus(tab.id);
});

// Block tab switching
chrome.tabs.onActivated.addListener(function(activeInfo) {
  checkLoginStatus(activeInfo.tabId);
});

// Block tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading') {
    checkLoginStatus(tabId);
  }
});

function checkAllTabs() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      checkLoginStatus(tab.id);
    });
  });
}

function checkLoginStatus(tabId) {
  chrome.storage.sync.get(['isLoggedIn', 'isFirstRun'], function(result) {
    if (result.isFirstRun === undefined) {
      // First time running the extension
      chrome.storage.sync.set({
        isFirstRun: false,
        password: 'Au',
        isLoggedIn: false
      }, function() {
        redirectToLogin(tabId);
      });
    } else if (!result.isLoggedIn) {
      redirectToLogin(tabId);
    }
  });
}

function redirectToLogin(tabId) {
  chrome.tabs.get(tabId, function(tab) {
    if (tab && !tab.url.includes('chrome-extension://')) {
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('popup.html')
      });
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "checkLogin") {
    chrome.storage.sync.get(['isLoggedIn'], function(result) {
      sendResponse({isLoggedIn: result.isLoggedIn});
    });
    return true;
  }
}); 