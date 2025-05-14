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
    if (result.isLoggedIn) {
      showSettings();
    } else {
      showLogin();
    }
  });

  // Handle login
  loginButton.addEventListener('click', function() {
    const password = passwordInput.value;
    chrome.storage.sync.get(['password'], function(result) {
      if (result.password === password) {
        chrome.storage.sync.set({ isLoggedIn: true }, function() {
          // Notify background script that login was successful
          chrome.runtime.sendMessage({action: "loginSuccess"}, function(response) {
            showSettings();
            
            // Redirect to ChatGPT after successful login
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs[0]) {
                chrome.tabs.update(tabs[0].id, { url: 'https://chat.openai.com/' });
                // Also open a new tab with ChatGPT
                chrome.tabs.create({ url: 'https://chat.openai.com/' });
              }
            });
          });
        });
      } else {
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
    chrome.storage.sync.set({ isLoggedIn: false }, function() {
      showLogin();
      // Redirect to login page after logout
      chrome.tabs.update({ url: chrome.runtime.getURL('loginRedirect.html') });
    });
  });

  function showSettings() {
    loginForm.style.display = 'none';
    settingsForm.style.display = 'block';
    messageElement.textContent = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
  }

  function showLogin() {
    loginForm.style.display = 'block';
    settingsForm.style.display = 'none';
    passwordInput.value = '';
    messageElement.textContent = '';
    passwordInput.focus();
  }
}); 