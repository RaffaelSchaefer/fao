// @ts-nocheck
import * as path from 'path';
import http from 'http';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { Server as SocketIO } from 'socket.io';
import compress from 'compression';
import { fileURLToPath } from 'url';
import { auth, discordConfigured } from './auth.js';
import { getAuthIdentity } from './auth-session.js';
import { initializeDatabase } from './db/index.js';
import { getRecentHistoryForUser } from './game-history.js';
import handleSockets from './socket-handler.js';
import { loadPrompts } from './prompts/prompts-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3000;

const io = new SocketIO(httpServer);

async function startServer() {
	const lobby = handleSockets(io); // socket.io app logic

	await initializeDatabase();

	app.get('/api/auth/config', (_req, res) => {
		res.json({
			discordEnabled: discordConfigured,
		});
	});
	app.all('/api/auth/*', toNodeHandler(auth));

	app.get('/api/me/history', async (req, res) => {
		const identity = await getAuthIdentity(req.headers);
		if (!identity) {
			res.status(401).json({ err: 'Sign in to view game history' });
			return;
		}

		const history = await getRecentHistoryForUser(identity.authUserId);
		if (!history) {
			res.status(503).json({ err: 'Game history is unavailable until DATABASE_URL is configured' });
			return;
		}

		res.json({ history });
	});

	app.use(compress()); // gzip responses

	app.use(express.static(path.resolve(__dirname, '..', 'public')));

	const prompts = await loadPrompts();

	console.log(`Prompts loaded. Counted ${prompts.length} prompts`);

	await new Promise<void>((resolve, reject) => {
		httpServer.once('error', reject);
		httpServer.listen(port, function() {
			httpServer.off('error', reject);
			console.log(`httpServer listening on port ${port}`);
			resolve();
		});
	});

	return lobby;
}

export default startServer();
