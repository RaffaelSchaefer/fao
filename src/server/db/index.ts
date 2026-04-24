import 'dotenv/config';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { schema } from './schema.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString }) : undefined;
const db = pool ? drizzle(pool, { schema }) : undefined;
const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
let databaseReady = false;

async function waitForDatabase(maxAttempts = 30, retryDelayMs = 1000) {
	if (!pool) {
		return;
	}

	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await pool.query('select 1');
			return;
		} catch (error) {
			lastError = error;
			const attemptLabel = `${attempt}/${maxAttempts}`;
			console.warn(`Database not ready yet (${attemptLabel})`);
			if (attempt < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
			}
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error('Unable to connect to the database');
}

async function migrateDatabase() {
	if (!db) {
		return;
	}

	await migrate(db, {
		migrationsFolder,
	});
}

async function initializeDatabase() {
	if (!pool) {
		databaseReady = false;
		return false;
	}

	try {
		const shouldFailFast = process.env.NODE_ENV === 'production';
		await waitForDatabase(shouldFailFast ? 30 : 3, shouldFailFast ? 1000 : 250);
		await migrateDatabase();
		databaseReady = true;
		return true;
	} catch (error) {
		databaseReady = false;
		const shouldFailFast = process.env.NODE_ENV === 'production';
		console.warn('Database unavailable, continuing without persistence', error);
		if (shouldFailFast) {
			throw error;
		}
		return false;
	}
}

function isDatabaseReady() {
	return databaseReady;
}

export { db, pool };
export const databaseEnabled = Boolean(db);
export { initializeDatabase, isDatabaseReady, migrateDatabase, waitForDatabase };
