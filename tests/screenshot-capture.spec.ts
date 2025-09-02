import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('helpNINJA Screenshot Capture', () => {
  const screenshotDir = 'screenshots';
  
  test.beforeAll(async ({ browser }) => {
    // Create screenshots directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Landing Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for animations to complete
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '01-landing-page.png'),
      fullPage: true
    });
  });

  test('Sign Up Page', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '02-signup-page.png'),
      fullPage: true
    });
  });

  test('Sign In Page', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '03-signin-page.png'),
      fullPage: true
    });
  });

  test('Dashboard Main Page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '04-dashboard-main.png'),
      fullPage: true
    });
  });

  test('Dashboard Analytics', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '05-dashboard-analytics.png'),
      fullPage: true
    });
  });

  test('Dashboard Conversations', async ({ page }) => {
    await page.goto('/dashboard/conversations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '06-dashboard-conversations.png'),
      fullPage: true
    });
  });

  test('Dashboard Documents', async ({ page }) => {
    await page.goto('/dashboard/documents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '07-dashboard-documents.png'),
      fullPage: true
    });
  });

  test('Dashboard Sources', async ({ page }) => {
    await page.goto('/dashboard/sources');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '08-dashboard-sources.png'),
      fullPage: true
    });
  });

  test('Dashboard Sites', async ({ page }) => {
    await page.goto('/dashboard/sites');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '09-dashboard-sites.png'),
      fullPage: true
    });
  });

  test('Dashboard Widget Configuration', async ({ page }) => {
    await page.goto('/dashboard/widget');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '10-dashboard-widget.png'),
      fullPage: true
    });
  });

  test('Dashboard Integrations', async ({ page }) => {
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '11-dashboard-integrations.png'),
      fullPage: true
    });
  });

  test('Dashboard Rules', async ({ page }) => {
    await page.goto('/dashboard/rules');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '12-dashboard-rules.png'),
      fullPage: true
    });
  });

  test('Dashboard Billing', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '13-dashboard-billing.png'),
      fullPage: true
    });
  });

  test('Dashboard Settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '14-dashboard-settings.png'),
      fullPage: true
    });
  });

  test('Dashboard Account', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '15-dashboard-account.png'),
      fullPage: true
    });
  });

  test('Dashboard Team', async ({ page }) => {
    await page.goto('/dashboard/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '16-dashboard-team.png'),
      fullPage: true
    });
  });

  test('Dashboard Feedback', async ({ page }) => {
    await page.goto('/dashboard/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '17-dashboard-feedback.png'),
      fullPage: true
    });
  });

  test('Dashboard Events', async ({ page }) => {
    await page.goto('/dashboard/events');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '18-dashboard-events.png'),
      fullPage: true
    });
  });

  test('Dashboard Outbox', async ({ page }) => {
    await page.goto('/dashboard/outbox');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '19-dashboard-outbox.png'),
      fullPage: true
    });
  });

  test('Dashboard Playground', async ({ page }) => {
    await page.goto('/dashboard/playground');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '20-dashboard-playground.png'),
      fullPage: true
    });
  });

  test('Dashboard Answers', async ({ page }) => {
    await page.goto('/dashboard/answers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '21-dashboard-answers.png'),
      fullPage: true
    });
  });

  test('Invite Page', async ({ page }) => {
    // This will show the invite form (token will be invalid but we can capture the UI)
    await page.goto('/invite/invalid-token');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '22-invite-page.png'),
      fullPage: true
    });
  });

  test('Mobile Responsive - Landing Page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '23-mobile-landing-page.png'),
      fullPage: true
    });
  });

  test('Tablet Responsive - Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotDir, '24-tablet-dashboard.png'),
      fullPage: true
    });
  });
});
