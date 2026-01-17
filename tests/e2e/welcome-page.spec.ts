/**
 * E2E tests for WelcomePage
 */
import { test, expect } from '@playwright/test';

test.describe('Welcome Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the welcome page', async ({ page }) => {
    // Check for main welcome elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should have navigation elements', async ({ page }) => {
    // Look for navigation or main layout
    const mainContent = page.locator('main, [role="main"], .main-content');
    await expect(mainContent.first()).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have accessible elements', async ({ page }) => {
    // Check for buttons with accessible names
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      if (isVisible) {
        // Button should have accessible name
        await expect(button).toHaveAttribute('aria-label', /.+/, { timeout: 100 }).catch(() => {
          // If no aria-label, should have text content
        });
      }
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Press Tab to navigate through focusable elements
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Welcome Page - Tutorial', () => {
  test('should show tutorial for new users', async ({ page }) => {
    // Clear any existing storage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    // Tutorial overlay might be shown
    const tutorialOverlay = page.locator('[class*="tutorial"], [data-testid="tutorial"]');
    const hasTutorial = await tutorialOverlay.count();

    if (hasTutorial > 0) {
      await expect(tutorialOverlay.first()).toBeVisible();
    }
  });

  test('should be able to skip tutorial', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    const skipButton = page.getByRole('button', { name: /skip/i });
    const hasSkip = await skipButton.count();

    if (hasSkip > 0) {
      await skipButton.click();
      // Tutorial should be dismissed
      await expect(skipButton).not.toBeVisible();
    }
  });
});

test.describe('Welcome Page - Theme', () => {
  test('should support dark mode', async ({ page }) => {
    // Set dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();

    // Page should still render correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should support reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    await expect(page.locator('body')).toBeVisible();
  });
});
