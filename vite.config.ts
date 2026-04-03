import { defineConfig } from 'vite-plus';
import vue from '@vitejs/plugin-vue';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [vue()],
	publicDir: resolve(rootDir, 'src/public/static'),
	resolve: {
		alias: {
			'@': resolve(rootDir, 'src'),
		},
	},
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true,
		proxy: {
			'/socket.io': {
				target: 'http://localhost:3000',
				ws: true,
			},
		},
	},
	build: {
		outDir: 'dist/public',
		emptyOutDir: true,
		sourcemap: true,
	},
	test: {
		environment: 'node',
		include: ['test/server/**/*.spec.ts'],
	},
	staged: {
		'*.{js,ts,tsx,vue}': 'vp check --fix',
	},
});
