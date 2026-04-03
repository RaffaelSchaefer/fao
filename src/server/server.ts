// @ts-nocheck
import * as path from 'path';
import http from 'http';
import express from 'express';
import { Server as SocketIO } from 'socket.io';
import compress from 'compression';
import { fileURLToPath } from 'url';
import handleSockets from './socket-handler.js';
import { loadPrompts } from './prompts/prompts-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3000;

const io = new SocketIO(httpServer);

async function startServer() {
	const lobby = handleSockets(io); // socket.io app logic

	app.use(compress()); // gzip responses

	app.use(express.static(path.resolve(__dirname, '..', 'public')));

	const prompts = await loadPrompts();

	console.log(`Prompts loaded. Counted ${prompts.length} prompts`);

	httpServer.listen(port, function() {
		console.log(`httpServer listening on port ${port}`);
	});

	return lobby;
}

export default startServer();
