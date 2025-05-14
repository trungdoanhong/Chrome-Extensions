document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const settingsForm = document.getElementById('settingsForm');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginButton');
  const messageElement = document.getElementById('message');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const saveButton = document.getElementById('saveButton');
  const logoutButton = document.getElementById('logoutButton');

  console.log("SafeLogin Popup: DOM content loaded");

  // Handle Enter key in password input
  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loginButton.click();
    }
  });

  // Handle Enter key in new password inputs
  newPasswordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });
  confirmPasswordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });

  // Check login status
  chrome.storage.sync.get(['isLoggedIn'], function(result) {
    console.log("SafeLogin Popup: Login status check:", result.isLoggedIn);
    if (result.isLoggedIn) {
      showSettings();
    } else {
      showLogin();
      // Focus on password field immediately
      passwordInput.focus();
    }
  });

  // Handle login
  loginButton.addEventListener('click', function() {
    console.log("SafeLogin Popup: Login button clicked");
    const password = passwordInput.value;
    
    if (!password) {
      messageElement.textContent = 'Please enter a password';
      return;
    }
    
    chrome.storage.sync.get(['password'], function(result) {
      if (result.password === password) {
        chrome.storage.sync.set({ isLoggedIn: true }, function() {
          console.log("SafeLogin Popup: Login successful");
          
          // Notify background script that login was successful
          chrome.runtime.sendMessage({action: "loginSuccess"}, function(response) {
            console.log("SafeLogin Popup: Background script notified of login");
            showSettings();
            
            // Redirect to ChatGPT after successful login
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs[0]) {
                console.log("SafeLogin Popup: Redirecting current tab to ChatGPT");
                chrome.tabs.update(tabs[0].id, { url: 'https://chat.openai.com/' });
                
                // Also open a new tab with ChatGPT
                console.log("SafeLogin Popup: Opening new tab with ChatGPT");
                chrome.tabs.create({ url: 'https://chat.openai.com/' });
                
                // Close this popup tab if we're in a tab
                if (window.location.href.includes(chrome.runtime.getURL(''))) {
                  console.log("SafeLogin Popup: We're in a tab, not a popup");
                  // We're in a tab, not in a popup
                  setTimeout(function() {
                    window.close();
                  }, 500);
                }
              }
            });
          });
        });
      } else {
        console.log("SafeLogin Popup: Incorrect password");
        messageElement.textContent = 'Incorrect password!';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
  });

  // Handle password change
  saveButton.addEventListener('click', function() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword || !confirmPassword) {
      messageElement.textContent = 'Please fill in both password fields!';
      return;
    }

    if (newPassword.length < 3) {
      messageElement.textContent = 'Password must be at least 3 characters!';
      return;
    }

    if (newPassword !== confirmPassword) {
      messageElement.textContent = 'Passwords do not match!';
      return;
    }

    chrome.storage.sync.set({ password: newPassword }, function() {
      messageElement.textContent = 'Password updated successfully!';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      // Show success message for 2 seconds
      setTimeout(() => {
        messageElement.textContent = '';
      }, 2000);
    });
  });

  // Handle logout
  logoutButton.addEventListener('click', function() {
    console.log("SafeLogin Popup: Logout button clicked");
    chrome.storage.sync.set({ isLoggedIn: false }, function() {
      console.log("SafeLogin Popup: Logged out successfully");
      showLogin();
      
      // If we're in a tab, reload it to show login
      if (window.location.href.includes(chrome.runtime.getURL(''))) {
        console.log("SafeLogin Popup: Reloading tab");
        window.location.reload();
      }
    });
  });

  function showSettings() {
    console.log("SafeLogin Popup: Showing settings");
    loginForm.style.display = 'none';
    settingsForm.style.display = 'block';
    messageElement.textContent = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
  }

  function showLogin() {
    console.log("SafeLogin Popup: Showing login");
    loginForm.style.display = 'block';
    settingsForm.style.display = 'none';
    passwordInput.value = '';
    messageElement.textContent = '';
    passwordInput.focus();
  }
}); 