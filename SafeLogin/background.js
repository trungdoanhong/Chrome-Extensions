// Global variables
let isInitialized = false;

// Force check on extension initialization
(function initialize() {
  console.log("SafeLogin: Extension initialized");
  // Initialize sync data if needed
  chrome.storage.sync.get(['isFirstRun', 'isLoggedIn'], function(result) {
    if (result.isFirstRun === undefined) {
      chrome.storage.sync.set({
        isFirstRun: false,
        password: 'Au',
        isLoggedIn: false
      }, function() {
        console.log("SafeLogin: First run initialization complete");
        isInitialized = true;
        checkAllTabs();
      });
    } else {
      console.log("SafeLogin: Already initialized, checking login status:", result.isLoggedIn);
      isInitialized = true;
      // Force logout on browser restart
      chrome.storage.sync.set({ isLoggedIn: false }, function() {
        checkAllTabs();
      });
    }
  });
})();

// Check login status when extension starts
chrome.runtime.onStartup.addListener(function() {
  console.log("SafeLogin: Browser startup detected");
  // Reset login status when browser starts
  chrome.storage.sync.set({ isLoggedIn: false }, function() {
    console.log("SafeLogin: Logged out on browser startup");
    checkAllTabs();
  });
});

// Check login status when browser starts
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("SafeLogin: Extension installed or updated", details.reason);
  if (details.reason === "install") {
    chrome.storage.sync.set({
      isFirstRun: false,
      password: 'Au',
      isLoggedIn: false
    }, function() {
      console.log("SafeLogin: Initial settings on install");
    });
  } else if (details.reason === "update") {
    chrome.storage.sync.set({ isLoggedIn: false }, function() {
      console.log("SafeLogin: Logged out on update");
    });
  }
  setTimeout(checkAllTabs, 1000); // Small delay to ensure everything is loaded
});

// Handle window close event - log out when browser is closed
chrome.windows.onRemoved.addListener(function(windowId) {
  chrome.windows.getAll(function(windows) {
    if (windows.length === 0) {
      // All windows closed, log out
      console.log("SafeLogin: All windows closed, logging out");
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
  console.log("SafeLogin: New tab created", tab.id);
  blockIfNotLoggedIn(tab.id, tab.url || '');
});

// Block tab switching
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log("SafeLogin: Tab activated", activeInfo.tabId);
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab) {
      blockIfNotLoggedIn(tab.id, tab.url || '');
    }
  });
});

// Block tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    console.log("SafeLogin: Tab updated", tabId, changeInfo.url);
    blockIfNotLoggedIn(tabId, changeInfo.url);
  }
});

function checkAllTabs() {
  console.log("SafeLogin: Checking all tabs");
  chrome.tabs.query({}, function(tabs) {
    console.log("SafeLogin: Found " + tabs.length + " tabs");
    tabs.forEach(function(tab) {
      blockIfNotLoggedIn(tab.id, tab.url || '');
    });
  });
}

function blockIfNotLoggedIn(tabId, url) {
  // Skip blocking for extension pages and chrome:// URLs
  if (!isInitialized) {
    console.log("SafeLogin: Not initialized yet, skipping check for tab", tabId);
    return;
  }
  
  if (url.startsWith(chrome.runtime.getURL('')) || 
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://')) {
    console.log("SafeLogin: Skipping blocking for internal URL", url);
    return;
  }

  chrome.storage.sync.get(['isLoggedIn'], function(result) {
    if (!result.isLoggedIn) {
      console.log("SafeLogin: Not logged in, redirecting tab", tabId);
      redirectToLoginPage(tabId);
    } else {
      console.log("SafeLogin: User is logged in, allowing tab", tabId);
    }
  });
}

function redirectToLoginPage(tabId) {
  const loginUrl = chrome.runtime.getURL('popup.html');
  console.log("SafeLogin: Redirecting to", loginUrl);
  chrome.tabs.update(tabId, { url: loginUrl });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "checkLogin") {
    chrome.storage.sync.get(['isLoggedIn'], function(result) {
      console.log("SafeLogin: Checking login status:", result.isLoggedIn);
      sendResponse({isLoggedIn: result.isLoggedIn});
    });
    return true;
  } else if (request.action === "loginSuccess") {
    // When login is successful, allow all tabs to navigate
    console.log("SafeLogin: Login successful");
    checkAllTabs();
    sendResponse({status: "success"});
    return true;
  }
}); 