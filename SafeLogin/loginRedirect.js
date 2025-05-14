// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add click event listener to login button
  document.getElementById('loginButton').addEventListener('click', function() {
    // Navigate to the login page
    window.location.href = chrome.runtime.getURL('popup.html');
  });
}); 