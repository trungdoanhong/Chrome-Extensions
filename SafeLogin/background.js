// Global variables
let isInitialized = false;
let loginTabIds = new Set();

// Force check on extension initialization
(function initialize() {
  console.log("SafeLogin: Extension initialized");
  
  // Force logout on extension load
  chrome.storage.sync.set({ isLoggedIn: false }, function() {
    // Initialize sync data if needed
    chrome.storage.sync.get(['isFirstRun'], function(result) {
      if (result.isFirstRun === undefined) {
        chrome.storage.sync.set({
          isFirstRun: false,
          password: 'Au',
          isLoggedIn: false
        }, function() {
          console.log("SafeLogin: First run initialization complete");
          isInitialized = true;
          forceShowLoginPopup();
          setTimeout(checkAllTabs, 500);
        });
      } else {
        console.log("SafeLogin: Already initialized, forcing logout");
        isInitialized = true;
        forceShowLoginPopup();
        setTimeout(checkAllTabs, 500);
      }
    });
  });
})();

// Check login status when extension starts
chrome.runtime.onStartup.addListener(function() {
  console.log("SafeLogin: Browser startup detected");
  // Reset login status when browser starts
  chrome.storage.sync.set({ isLoggedIn: false }, function() {
    console.log("SafeLogin: Logged out on browser startup");
    forceShowLoginPopup();
    setTimeout(checkAllTabs, 500);
  });
});

// Check login status when browser starts
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("SafeLogin: Extension installed or updated", details.reason);
  chrome.storage.sync.set({ isLoggedIn: false }, function() {
    if (details.reason === "install") {
      chrome.storage.sync.set({
        isFirstRun: false,
        password: 'Au'
      }, function() {
        console.log("SafeLogin: Initial settings on install");
        forceShowLoginPopup();
      });
    } else {
      console.log("SafeLogin: Logged out on update");
      forceShowLoginPopup();
    }
    setTimeout(checkAllTabs, 1000);
  });
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

// Force open the login popup
function forceShowLoginPopup() {
  console.log("SafeLogin: Force showing login popup");
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") }, function(tab) {
    loginTabIds.add(tab.id);
  });
}

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
  chrome.storage.sync.get(['isLoggedIn'], function(result) {
    if (!result.isLoggedIn) {
      // If it's not a login tab, redirect
      if (!tab.pendingUrl || (!tab.pendingUrl.includes(chrome.runtime.getURL("")))) {
        redirectToLoginPage(tab.id);
      } else {
        // This is a login tab, track it
        loginTabIds.add(tab.id);
      }
    }
  });
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

// Add a handler for when a tab is closed
chrome.tabs.onRemoved.addListener(function(tabId) {
  // Remove from login tabs if it's there
  loginTabIds.delete(tabId);
});

// Add a webRequest listener to block requests
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.log("SafeLogin: Request detected", details.url);
    
    // Skip for extension resources
    if (details.url.startsWith(chrome.runtime.getURL(""))) {
      return { cancel: false };
    }
    
    return new Promise(resolve => {
      chrome.storage.sync.get(['isLoggedIn'], function(result) {
        if (!result.isLoggedIn) {
          console.log("SafeLogin: Blocking request", details.url);
          // If we're not logged in, redirect to login page
          chrome.tabs.update(details.tabId, { 
            url: chrome.runtime.getURL("popup.html") 
          });
          resolve({ cancel: true });
        } else {
          resolve({ cancel: false });
        }
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

function checkAllTabs() {
  console.log("SafeLogin: Checking all tabs");
  chrome.tabs.query({}, function(tabs) {
    console.log("SafeLogin: Found " + tabs.length + " tabs");
    chrome.storage.sync.get(['isLoggedIn'], function(result) {
      if (!result.isLoggedIn) {
        // If not logged in, check all tabs
        tabs.forEach(function(tab) {
          if (!tab.url || !tab.url.startsWith(chrome.runtime.getURL(""))) {
            redirectToLoginPage(tab.id);
          } else {
            // This is an extension page, keep track of it
            loginTabIds.add(tab.id);
          }
        });
      }
    });
  });
}

function blockIfNotLoggedIn(tabId, url) {
  // Skip blocking for extension pages and chrome:// URLs
  if (!isInitialized) {
    console.log("SafeLogin: Not initialized yet, skipping check for tab", tabId);
    return;
  }
  
  // Skip extension pages
  if (url.startsWith(chrome.runtime.getURL('')) || 
      url === "chrome://newtab/") {
    console.log("SafeLogin: Skipping blocking for extension URL", url);
    return;
  }
  
  // Skip Chrome system pages
  if (url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://')) {
    console.log("SafeLogin: Skipping blocking for Chrome URL", url);
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
  
  // Check if this is a login tab already
  if (loginTabIds.has(tabId)) {
    console.log("SafeLogin: Tab is already a login tab, not redirecting");
    return;
  }
  
  chrome.tabs.update(tabId, { url: loginUrl }, function() {
    // Add this to our login tabs set
    loginTabIds.add(tabId);
  });
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
    // When login is successful
    console.log("SafeLogin: Login successful");
    sendResponse({status: "success"});
    return true;
  }
}); 