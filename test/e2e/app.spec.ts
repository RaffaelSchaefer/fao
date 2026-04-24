import { expect, test, type Page } from '@playwright/test';

async function continueAsGuest(page: Page, username: string) {
	await page.goto('/');
	await page.waitForTimeout(100);
	await page.getByRole('button', { name: 'Play as Guest' }).click();
	await page.getByPlaceholder('Enter a username').fill(username);
	await page.locator('.gate-guest-form').getByRole('button', { name: 'Join' }).click();
}

async function createGame(page: Page, username: string) {
	await continueAsGuest(page, username);
	await page.locator('#new-game-menu-btn').click();
	await expect(page.locator('#room-setup')).toBeVisible();
	await expect(page.locator('.player-avatar').first()).toBeVisible();
}

async function joinGame(
	page: Page,
	roomCode: string,
	username: string
) {
	await continueAsGuest(page, username);
	await page.locator('#join-game-menu-btn').click();
	await page.locator('#join-code').fill(roomCode);
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.locator('#room-setup')).toBeVisible();
}

async function startGame(page: Page) {
	await page.getByRole('button', { name: 'Start Game' }).click();
	await expect(page.locator('#in-game')).toBeVisible();
}

async function exitToSetup(page: Page) {
	await page.locator('#game-menu-btn').click();
	await page.locator('#game-menu-dropdown li').filter({ hasText: 'Exit to setup' }).click();
	await page.locator('#confirm-setup-dialog').getByRole('button', { name: 'Confirm' }).click({ force: true });
	await expect(page.locator('#room-setup')).toBeVisible();
}

test('loads the app shell on mobile without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await page.goto('/');

	await expect(page.locator('#wrapper')).toBeVisible();
	await expect(page.locator('#home')).toBeVisible();
	await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Join Game' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Play as Guest' })).toBeVisible();
	const discordButton = page.getByRole('button', { name: 'Continue with Discord' });
	if (await discordButton.count()) {
		await expect(page.getByRole('button', { name: 'Continue with Discord' })).toBeVisible();
	} else {
		await expect(page.getByRole('button', { name: 'Continue with Discord' })).toHaveCount(0);
		await expect(page.locator('body')).toContainText(
			'Discord sign-in is unavailable in this environment.'
		);
	}
	await expect(page.locator('body')).toContainText('Fake Artist Online');
	await expect.poll(async () => {
		return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
	}).toBe(true);
});

test('opens invite links with the room code pre-filled', async ({ page }) => {
	await page.goto('/?room=2468');

	await expect(page.locator('#join-game-form')).toBeVisible();
	await expect(page.locator('#join-code')).toHaveValue('2468');
	await expect(page.locator('#join-username-input')).toHaveCount(0);
	await expect(page.locator('#create-username-input')).toHaveCount(0);
});

test('new game enters the lobby directly and join does not ask for username again', async ({ page }) => {
	await continueAsGuest(page, 'Guest Flow');

	await expect(page.locator('.account-chip')).toContainText('Guest Flow');
	await expect(page.locator('.account-chip')).toContainText('GUEST');

	await page.locator('#new-game-menu-btn').click();
	await expect(page.locator('#room-setup')).toBeVisible();
	await page.getByRole('button', { name: 'Leave' }).click();
	await expect(page.locator('#home')).toBeVisible();
	await expect(page.locator('#create-game-menu')).toHaveCount(0);
	await expect(page.locator('#create-username-input')).toHaveCount(0);

	await page.locator('#join-game-menu-btn').click();
	await expect(page.locator('#join-username-input')).toHaveCount(0);
	await expect(page.locator('#join-game-form')).toContainText('Joining as Guest Flow');
});

test('guest can logout from the home account panel', async ({ page }) => {
	await continueAsGuest(page, 'Guest Exit');

	await expect(page.locator('.account-chip')).toContainText('Guest Exit');
	await page.getByRole('button', { name: 'Logout' }).click();

	await expect(page.getByRole('button', { name: 'Play as Guest' })).toBeVisible();
	await expect(page.locator('.account-chip')).toHaveCount(0);
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
	const roomCode = await hostPage.locator('#room-setup .room-code-value').textContent();
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
	const roomCode = await hostPage.locator('#room-setup .room-code-value').textContent();
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

test('keeps authored custom topics private in the lobby', async ({ browser }) => {
	const host = await browser.newContext();
	const guest = await browser.newContext();
	const hostPage = await host.newPage();
	const guestPage = await guest.newPage();
	const suffix = Date.now().toString(36);
	const keyword = `Octopus ${suffix}`;

	await createGame(hostPage, `Host ${suffix}`);
	const roomCode = await hostPage.locator('#room-setup .room-code-value').textContent();
	expect(roomCode).toBeTruthy();

	await joinGame(guestPage, roomCode!.trim(), `Guest ${suffix}`);
	await guestPage.locator('input[placeholder="Keyword (e.g. Octopus)"]').fill(keyword);
	await guestPage.locator('input[placeholder="Hint (optional)"]').fill('Eight arms');
	await guestPage.getByRole('button', { name: 'Add' }).click();

	await expect(guestPage.locator('.topic-card.mine')).toContainText(keyword);
	await expect(hostPage.locator('.topic-card.redacted')).toContainText(`Guest ${suffix}`);
	await expect(hostPage.locator('.topic-card.redacted')).not.toContainText(keyword);

	await host.close();
	await guest.close();
});
