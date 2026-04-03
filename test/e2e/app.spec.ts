import { expect, test, type Page } from '@playwright/test';

async function createGame(page: Page, username: string) {
	await page.goto('/');
	await page.getByRole('button', { name: 'New Game' }).click();
	await page.locator('#create-username-input').fill(username);
	await page.getByRole('button', { name: 'Create' }).click();
	await expect(page.locator('#room-setup')).toBeVisible();
}

async function joinGame(
	page: Page,
	roomCode: string,
	username: string
) {
	await page.goto('/');
	await page.getByRole('button', { name: 'Join Game' }).click();
	await page.locator('#join-username-input').fill(username);
	await page.locator('#join-code').fill(roomCode);
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.locator('#room-setup')).toBeVisible();
}

async function startGame(page: Page) {
	await page.getByRole('button', { name: 'START GAME' }).click();
	await page.locator('#confirm-start').getByRole('button', { name: 'Start' }).click({
		force: true,
	});
	await expect(page.locator('#in-game')).toBeVisible();
}

async function exitToSetup(page: Page) {
	await page.locator('#game-menu-btn').click();
	await page.locator('#game-menu-dropdown li').filter({ hasText: 'Exit to setup' }).click();
	await page.locator('#confirm-setup-dialog').getByRole('button', { name: 'Confirm' }).click({
		force: true,
	});
	await expect(page.locator('#room-setup')).toBeVisible();
}

test('loads the app shell on mobile without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await page.goto('/');

	await expect(page.locator('#wrapper')).toBeVisible();
	await expect(page.locator('#home')).toBeVisible();
	await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Join Game' })).toBeVisible();
	await expect(page.locator('body')).toContainText('Fake Artist Online');
	await expect.poll(async () => {
		return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
	}).toBe(true);
});

test('moves between setup and game views for all connected clients', async ({ browser }) => {
	const host = await browser.newContext();
	const guest = await browser.newContext();
	const hostPage = await host.newPage();
	const guestPage = await guest.newPage();
	const suffix = Date.now().toString(36);
	const hostName = `Host ${suffix}`;
	const guestName = `Guest ${suffix}`;

	await createGame(hostPage, hostName);
	const roomCode = await hostPage.locator('#room-setup .p5-code-value').textContent();
	expect(roomCode).toBeTruthy();

	await joinGame(guestPage, roomCode!.trim(), guestName);
	await expect(guestPage.locator('#room-setup')).toContainText(roomCode!.trim());

	await startGame(hostPage);
	await expect(hostPage.locator('#drawing-pad')).toBeVisible();
	await expect(guestPage.locator('#drawing-pad')).toBeVisible();
	await expect(hostPage.locator('#room-setup')).toBeHidden();
	await expect(guestPage.locator('#room-setup')).toBeHidden();

	await exitToSetup(hostPage);
	await expect(hostPage.locator('#room-setup')).toBeVisible();
	await expect(guestPage.locator('#room-setup')).toBeVisible();

	await host.close();
	await guest.close();
});

test('reconnects an in-progress room after a forced disconnect', async ({ browser }) => {
	const host = await browser.newContext();
	const guest = await browser.newContext();
	const hostPage = await host.newPage();
	const guestPage = await guest.newPage();
	const suffix = Date.now().toString(36);

	await createGame(hostPage, `Host ${suffix}`);
	const roomCode = await hostPage.locator('#room-setup .p5-code-value').textContent();
	expect(roomCode).toBeTruthy();

	await joinGame(guestPage, roomCode!.trim(), `Guest ${suffix}`);
	await startGame(hostPage);

	await guest.setOffline(true);
	await guestPage.waitForTimeout(250);

	await guest.setOffline(false);
	await guestPage.waitForTimeout(500);
	await expect(guestPage.locator('#drawing-pad')).toBeVisible();
	await expect(guestPage.locator('#in-game')).toBeVisible();

	await host.close();
	await guest.close();
});
