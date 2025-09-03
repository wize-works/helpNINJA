#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'screenshots';
const BASE_URL = 'https://helpninja.app';

// Authentication credentials - you can set these via environment variables
const AUTH_EMAIL = process.env.SCREENSHOT_EMAIL || '';
const AUTH_PASSWORD = process.env.SCREENSHOT_PASSWORD || '';

// Define all the screens to capture
const publicScreens = [
    { name: '01-landing-page', path: '/', waitTime: 2000 },
    { name: '02-signup-page', path: '/auth/signup', waitTime: 1000 },
    { name: '03-signin-page', path: '/auth/signin', waitTime: 1000 },
    { name: '22-invite-page', path: '/invite/invalid-token', waitTime: 1000 },
];

const authenticatedScreens = [
    { name: '04-dashboard-main', path: '/dashboard', waitTime: 200 },
    { name: '05-dashboard-analytics', path: '/dashboard/analytics', waitTime: 200 },
    { name: '06-dashboard-conversations', path: '/dashboard/conversations', waitTime: 200 },
    { name: '07-dashboard-documents', path: '/dashboard/documents', waitTime: 200 },
    { name: '08-dashboard-sources', path: '/dashboard/sources', waitTime: 200 },
    { name: '09-dashboard-sites', path: '/dashboard/sites', waitTime: 200 },
    { name: '10-dashboard-widget', path: '/dashboard/widget', waitTime: 200 },
    { name: '11-dashboard-integrations', path: '/dashboard/integrations', waitTime: 200 },
    { name: '12-dashboard-rules', path: '/dashboard/rules', waitTime: 200 },
    { name: '13-dashboard-billing', path: '/dashboard/billing', waitTime: 200 },
    { name: '14-dashboard-settings', path: '/dashboard/settings', waitTime: 200 },
    { name: '15-dashboard-account', path: '/dashboard/account', waitTime: 200 },
    { name: '16-dashboard-team', path: '/dashboard/team', waitTime: 200 },
    { name: '17-dashboard-feedback', path: '/dashboard/feedback', waitTime: 200 },
    { name: '18-dashboard-events', path: '/dashboard/events', waitTime: 200 },
    { name: '19-dashboard-outbox', path: '/dashboard/outbox', waitTime: 200 },
    { name: '20-dashboard-playground', path: '/dashboard/playground', waitTime: 200 },
    { name: '21-dashboard-answers', path: '/dashboard/answers', waitTime: 200 },
];

// Responsive screenshots
const responsiveScreens = [
    { name: '23-mobile-landing-page', path: '/', viewport: { width: 375, height: 667 }, waitTime: 2000 },
    { name: '24-tablet-dashboard', path: '/dashboard', viewport: { width: 768, height: 1024 }, waitTime: 2000 },
];

// Helper function to set theme
async function setTheme(page, theme) {
    console.log(`🎨 Switching to ${theme} theme...`);

    try {
        // Set the theme directly via localStorage and HTML attribute
        await page.evaluate((themeName) => {
            // Set localStorage values
            localStorage.setItem('hn_theme_mode', themeName);
            localStorage.setItem('hn_theme_name', themeName);

            // Apply theme to HTML element
            document.querySelector('html')?.setAttribute('data-theme', themeName);

            return true;
        }, theme);

        // Wait for theme transition to complete
        await page.waitForTimeout(500);

        console.log(`✅ Successfully switched to ${theme} theme`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to switch to ${theme} theme:`, error.message);
        return false;
    }
}

// Helper function to capture a single screen in both themes
async function captureScreenWithThemes(page, screen) {
    const results = { light: false, dark: false };

    try {
        // Navigate to the screen
        console.log(`  📱 Navigating to: ${screen.name}`);
        await page.goto(`${BASE_URL}${screen.path}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(screen.waitTime);

        // Capture light theme
        await setTheme(page, 'light');
        try {
            const lightScreenshotPath = path.join(SCREENSHOT_DIR, `${screen.name}.png`);
            await page.screenshot({
                path: lightScreenshotPath,
                fullPage: true
            });
            console.log(`    ✅ Light: ${lightScreenshotPath}`);
            results.light = true;
        } catch (error) {
            console.error(`    ❌ Failed to capture light theme for ${screen.name}:`, error.message);
        }

        // Capture dark theme
        await setTheme(page, 'dark');
        try {
            const darkScreenshotPath = path.join(SCREENSHOT_DIR, `${screen.name}-dark.png`);
            await page.screenshot({
                path: darkScreenshotPath,
                fullPage: true
            });
            console.log(`    ✅ Dark: ${darkScreenshotPath}`);
            results.dark = true;
        } catch (error) {
            console.error(`    ❌ Failed to capture dark theme for ${screen.name}:`, error.message);
        }

    } catch (error) {
        console.error(`    ❌ Failed to navigate to ${screen.name}:`, error.message);
    }

    return results;
}

async function login(page) {
    console.log('🔐 Logging in to capture authenticated screens...');

    try {
        // Go to signin page
        await page.goto(`${BASE_URL}/auth/signin`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Wait for the form to be ready
        await page.waitForSelector('input[placeholder="you@helpninja.ai"]', { timeout: 10000 });

        // Fill in credentials using more specific selectors
        await page.fill('input[placeholder="you@helpninja.ai"]', AUTH_EMAIL);
        await page.fill('input[placeholder="Ninja Password!"]', AUTH_PASSWORD);

        // Click login button - try multiple selectors
        const loginButton = page.locator('button:has-text("Login")').first();
        await loginButton.click();

        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('✅ Successfully logged in');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.message);

        // Debug: take a screenshot of the current state
        try {
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'debug-login-failed.png') });
            console.log('📸 Debug screenshot saved: debug-login-failed.png');
        } catch {
            console.log('Could not save debug screenshot');
        }

        return false;
    }
}

async function captureScreenshots() {
    console.log('🚀 Starting screenshot capture for helpNINJA...');

    // Check if credentials are provided
    if (AUTH_EMAIL === 'your-email@example.com' || AUTH_PASSWORD === 'your-password') {
        console.log('⚠️  Warning: Using default credentials. Please set SCREENSHOT_EMAIL and SCREENSHOT_PASSWORD environment variables.');
        console.log('   Example: SCREENSHOT_EMAIL=your@email.com SCREENSHOT_PASSWORD=yourpass npm run screenshots');
        console.log('');
    }

    // Create screenshots directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshots directory: ${SCREENSHOT_DIR}`);
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        // Capture public screenshots first (both light and dark themes)
        console.log('\n📸 Capturing public screenshots (light & dark themes)...');
        for (const screen of publicScreens) {
            await captureScreenWithThemes(page, screen, false);
        }

        // Login to capture authenticated screens
        const loginSuccess = await login(page);

        if (loginSuccess) {
            // Capture authenticated screenshots (both light and dark themes)
            console.log('\n📸 Capturing authenticated dashboard screenshots (light & dark themes)...');
            for (const screen of authenticatedScreens) {
                await captureScreenWithThemes(page, screen);
            }

            // Capture responsive screenshots (both light and dark themes)
            console.log('\n📱 Capturing responsive screenshots (light & dark themes)...');
            for (const screen of responsiveScreens) {
                try {
                    console.log(`  📱 Setting viewport for: ${screen.name}`);
                    await page.setViewportSize(screen.viewport);
                    await captureScreenWithThemes(page, screen, true);
                } catch (error) {
                    console.error(`    ❌ Failed to capture responsive ${screen.name}:`, error.message);
                }
            }
        } else {
            console.log('\n⚠️  Skipping authenticated screens due to login failure');
            console.log('   Please check your credentials and try again');
        }

        console.log('\n🎉 Screenshot capture completed!');
        console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}/`);

        // List all captured screenshots
        const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
        console.log('\n📋 Captured screenshots:');
        files.forEach(file => {
            const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
            console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        });

    } catch (error) {
        console.error('❌ Error during screenshot capture:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Check if the app is running
async function checkAppRunning() {
    try {
        const response = await fetch(BASE_URL);
        return response.ok;
    } catch {
        return false;
    }
}

// Main execution
async function main() {
    console.log('🔍 Checking if helpNINJA app is running...');

    if (!(await checkAppRunning())) {
        console.error('❌ Error: helpNINJA app is not running on http://localhost:3001');
        console.log('💡 Please start the app with: npm run dev');
        process.exit(1);
    }

    console.log('✅ App is running, proceeding with screenshot capture...\n');

    await captureScreenshots();
}

// Run the script
main().catch(console.error);
