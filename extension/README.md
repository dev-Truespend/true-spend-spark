# TrueSpend Browser Extension - Setup Instructions

## Quick Start

### 1. Add Build Scripts to package.json

Since `package.json` is managed by the system, you'll need to add these scripts manually:

Open `package.json` and add the following to the `"scripts"` section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:extension": "vite build --mode extension && npm run manifest:copy",
    "dev:extension": "vite build --mode extension --watch",
    "manifest:copy": "cp extension/manifest.json dist/extension/manifest.json",
    "preview": "vite preview"
  }
}
```

**Note:** On Windows, replace `cp` with `copy`:
```json
"manifest:copy": "copy extension\\manifest.json dist\\extension\\manifest.json"
```

### 2. Update OAuth Client ID

Edit `extension/manifest.json` and replace the placeholder with your Google OAuth client ID:

```json
{
  "oauth2": {
    "client_id": "YOUR_ACTUAL_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

To get your client ID:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Application type: Chrome Extension
5. Copy the generated Client ID

### 3. Build the Extension

```bash
npm run build:extension
```

This will create a `dist/extension` folder with the built extension.

### 4. Load in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist/extension` directory
5. The extension should now appear in your toolbar

### 5. Test the Extension

- Click the extension icon
- Sign in with Google
- Your budgets should appear in the popup
- Visit Amazon.com to test merchant detection

## File Structure

```
extension/
├── manifest.json           # Extension configuration
├── popup/                  # Popup UI
│   ├── index.html
│   ├── index.tsx
│   ├── Popup.tsx
│   └── PrivacyModal.tsx
├── background/             # Service worker
│   ├── index.ts
│   └── auth.ts
└── content/                # Content scripts
    └── merchant-detector.ts
```

## Development Workflow

### Watch Mode (Auto-rebuild on changes)

```bash
npm run dev:extension
```

Then reload the extension in `chrome://extensions` after each build.

### Debugging

**Popup Console:**
1. Right-click extension icon → "Inspect popup"
2. View console, network, etc.

**Background Worker Console:**
1. Go to `chrome://extensions`
2. Find TrueSpend extension
3. Click "Service Worker" link
4. View background script console

**Content Script Console:**
1. Open any e-commerce site (e.g., Amazon)
2. Press F12 for DevTools
3. Check console for merchant detection logs

## Common Issues

### "OAuth client ID not configured"
- Make sure you updated `manifest.json` with your actual Google OAuth client ID
- Verify the client ID matches your Google Cloud Console credentials

### "Extension not showing budgets"
- Check if you're signed into the main TrueSpend app
- Verify CORS headers in Supabase allow `chrome-extension://*`
- Check popup console for authentication errors

### "Service worker stopped"
- This is normal - MV3 service workers are ephemeral
- They restart automatically when needed
- Use `chrome.alarms` for persistent tasks (already implemented)

## Next Steps

Week 2 will add:
- Options page for settings
- Real-time budget alerts via badges
- Enhanced telemetry tracking
- Feature flags service
- Improved merchant detection

## Documentation

See `docs/BROWSER_EXTENSION_GUIDE.md` for complete development guide.
