# Screenshot Capture Guide for helpNINJA

This guide explains how to capture screenshots of all screens in the helpNINJA application using Playwright.

## Overview

The screenshot capture system provides two ways to capture screenshots:

1. **Standalone Script** (`scripts/capture-screenshots.mjs`) - Quick and easy way to capture all screens
2. **Playwright Test Suite** (`tests/screenshot-capture.spec.ts`) - Full test framework with reporting

## Prerequisites

- Node.js 18+ installed
- helpNINJA app running on `http://localhost:3001`
- Playwright installed (already included in dependencies)
- **Authentication credentials** for dashboard access (see Authentication section below)

## Quick Start

### 1. Start the Application

```bash
npm run dev
```

This will start the app on `http://localhost:3001`

### 2. Set Authentication Credentials

Create a `.env` file in your project root with your helpNINJA credentials:

```bash
# Copy the example file
cp screenshot-env.example .env

# Edit .env with your actual credentials
SCREENSHOT_EMAIL=your-actual-email@example.com
SCREENSHOT_PASSWORD=your-actual-password
```

### 3. Capture Screenshots

```bash
npm run screenshots
```

This will capture screenshots of all screens and save them to the `screenshots/` directory.

## Available Commands

### Screenshot Commands

- `npm run screenshots` - Capture screenshots using the standalone script (with authentication)
- `npm run screenshots:debug` - Debug login process (shows browser window)
- `npm run screenshots:test` - Run the full Playwright test suite
- `npm run screenshots:install` - Install Playwright browsers (if needed)

### Authentication

The screenshot script automatically handles authentication to capture dashboard screens:

1. **Public screens** are captured first (landing, signup, signin)
2. **Login process** is automated using your credentials
3. **Dashboard screens** are captured after successful authentication
4. **Responsive views** are captured in authenticated state

**Security Note**: Credentials are only used locally for screenshot capture and are never stored in the screenshots themselves.

### Manual Execution

```bash
# Standalone script
node scripts/capture-screenshots.mjs

# Playwright test
npx playwright test tests/screenshot-capture.spec.ts
```

## Screenshots Captured

The script captures the following screens:

### Public Pages
- Landing page (`/`)
- Sign up page (`/auth/signup`)
- Sign in page (`/auth/signin`)
- Invite page (`/invite/[token]`)

### Dashboard Pages
- Main dashboard (`/dashboard`)
- Analytics (`/dashboard/analytics`)
- Conversations (`/dashboard/conversations`)
- Documents (`/dashboard/documents`)
- Sources (`/dashboard/sources`)
- Sites (`/dashboard/sites`)
- Widget configuration (`/dashboard/widget`)
- Integrations (`/dashboard/integrations`)
- Rules (`/dashboard/rules`)
- Billing (`/dashboard/billing`)
- Settings (`/dashboard/settings`)
- Account (`/dashboard/account`)
- Team (`/dashboard/team`)
- Feedback (`/dashboard/feedback`)
- Events (`/dashboard/events`)
- Outbox (`/dashboard/outbox`)
- Playground (`/dashboard/playground`)
- Answers (`/dashboard/answers`)

### Responsive Views
- Mobile landing page (375x667)
- Tablet dashboard (768x1024)

## Output

Screenshots are saved to the `screenshots/` directory with the following naming convention:

```
screenshots/
├── 01-landing-page.png
├── 02-signup-page.png
├── 03-signin-page.png
├── 04-dashboard-main.png
├── 05-dashboard-analytics.png
├── ...
├── 23-mobile-landing-page.png
└── 24-tablet-dashboard.png
```

## Configuration

### Standalone Script Configuration

Edit `scripts/capture-screenshots.mjs` to modify:

- **Screenshot directory**: Change `SCREENSHOT_DIR` constant
- **Base URL**: Change `BASE_URL` constant
- **Wait times**: Adjust `waitTime` for each screen
- **Viewport sizes**: Modify responsive screen dimensions
- **Browser options**: Customize browser launch parameters

### Playwright Configuration

Edit `playwright.config.ts` to modify:

- **Browser**: Change from Chromium to Firefox/WebKit
- **Viewport**: Adjust default viewport size
- **Screenshot settings**: Modify screenshot behavior
- **Web server**: Change development server settings

## Troubleshooting

### Common Issues

1. **App not running**
   ```
   ❌ Error: helpNINJA app is not running on http://localhost:3001
   💡 Please start the app with: npm run dev
   ```
   **Solution**: Start the development server with `npm run dev`

2. **Authentication failures**
   ```
   ❌ Login failed: [error message]
   ⚠️  Skipping authenticated screens due to login failure
   ```
   **Solutions**:
   - Verify your credentials in the `.env` file
   - Ensure your account exists and is active
   - Check if 2FA is enabled (may require additional setup)
   - Try logging in manually first to verify credentials

3. **Dashboard screens showing login page**
   - This happens when authentication fails
   - The script will skip these screens and continue with public ones
   - Check the console output for authentication errors

4. **Screenshot failures**
   - Check browser console for JavaScript errors
   - Verify the page loads completely
   - Adjust wait times if pages load slowly

5. **Permission errors**
   ```bash
   npm run screenshots:install
   ```

### Debug Mode

For troubleshooting login issues, use the debug script:

```bash
npm run screenshots:debug
```

This will:
- Open a visible browser window
- Show the login process step by step
- Take debug screenshots at each stage
- Keep the browser open for 30 seconds for manual inspection
- Display detailed console output about form elements found

You can also modify the main script to run in non-headless mode:

```javascript
const browser = await chromium.launch({ 
  headless: false, // Change to false to see the browser
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

## Customization

### Adding New Screens

To capture additional screens, add them to the `screens` array in `scripts/capture-screenshots.mjs`:

```javascript
const screens = [
  // ... existing screens
  { name: '25-new-feature', path: '/dashboard/new-feature', waitTime: 2000 },
];
```

### Custom Wait Conditions

Instead of fixed wait times, you can wait for specific elements:

```javascript
// Wait for a specific element to appear
await page.waitForSelector('.dashboard-content', { timeout: 10000 });

// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for animations to complete
await page.waitForTimeout(2000);
```

### Different Viewport Sizes

Add custom viewport sizes for responsive testing:

```javascript
const customScreens = [
  { name: 'desktop-large', path: '/', viewport: { width: 2560, height: 1440 }, waitTime: 2000 },
  { name: 'mobile-landscape', path: '/', viewport: { width: 667, height: 375 }, waitTime: 2000 },
];
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Screenshot Capture
on: [push, pull_request]
jobs:
  screenshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run screenshots:install
      - run: npm run dev &
      - run: sleep 30
      - run: npm run screenshots
      - uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: screenshots/
```

### Docker

```dockerfile
# Install Playwright browsers
RUN npx playwright install chromium

# Copy and run screenshot script
COPY scripts/capture-screenshots.mjs /app/scripts/
RUN chmod +x /app/scripts/capture-screenshots.mjs
```

## Performance Tips

1. **Parallel execution**: Use the Playwright test suite for parallel screenshot capture
2. **Browser reuse**: The standalone script reuses the same browser instance
3. **Optimized waits**: Use specific wait conditions instead of fixed timeouts
4. **Headless mode**: Keep `headless: true` for faster execution

## File Sizes

Typical screenshot file sizes:
- Desktop screenshots: 200-800 KB
- Mobile screenshots: 150-500 KB
- Full-page screenshots: 500-1500 KB

Total storage for all screenshots: ~10-20 MB

## Support

For issues with screenshot capture:

1. Check the console output for error messages
2. Verify the app is running and accessible
3. Check browser console for JavaScript errors
4. Review Playwright documentation: https://playwright.dev/
