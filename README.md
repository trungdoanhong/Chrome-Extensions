# SafeLogin - Chrome Protection Extension

A Chrome extension that protects your browser with password authentication.

## Features

- Password protection for Chrome browser
- Default password: "Au"
- Requires login after closing and reopening browser
- Completely blocks access to all websites until logged in
- Redirects to ChatGPT.com after successful login
- Password can be changed in settings
- Supports data syncing between devices using Chrome Sync

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `SafeLogin` folder
5. The extension will be installed and active immediately

## Usage

1. When you open Chrome, you'll be prompted for a password
2. Enter the default password: "Au" (or your custom password if changed)
3. After successful login, you'll be redirected to ChatGPT
4. To change your password, click on the extension icon and go to Settings

## Syncing Between Devices

The extension uses Chrome's sync storage to sync your password and settings between devices:

1. Make sure you're signed in to Chrome with your Google account
2. Install the extension on all your devices
3. Your password and settings will be synced automatically

## Version History

- v2.0: Completely redesigned security model with forced login popup
- v1.9: Enhanced login check on browser startup
- v1.8: Fixed extension errors by providing minimal redirect page
- v1.7: Fixed CSP issues by using direct popup redirection
- v1.6: Fixed Content Security Policy issues with HTML meta refresh
- v1.5: Fixed Content Security Policy issues to improve reliability
- v1.4: Enhanced security to block access to all websites until logged in
- v1.3: Added sync support between devices
- v1.2: Added automatic logout on browser close and ChatGPT redirect
- v1.1: Improved password change functionality
- v1.0: Initial release with basic password protection

## License

This project is open source and available under the MIT License. 