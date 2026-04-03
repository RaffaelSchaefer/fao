import { expect, test } from '@playwright/test';

test('loads the app shell', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('#wrapper')).toBeVisible();
	await expect(page.locator('body')).toContainText('Fake Artist Online');
});
