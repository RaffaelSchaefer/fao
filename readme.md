# Fake Artist Online

An online party game based on Oink Games' tabletop game, _A Fake Artist Goes to New York_.

## Stack

- Vue 3 + TypeScript
- Tailwind CSS
- Vite+
- Express
- Socket.IO 4
- Vitest + Playwright

## Development

```bash
npm install
npm run dev
```

For `npm run dev`, Better Auth should use the browser origin. Set `BETTER_AUTH_URL=http://127.0.0.1:5173` when using the Vite dev server.

For Discord OAuth, register the callback URI shown by your auth config. By default this app uses:

```bash
${BETTER_AUTH_URL}/api/auth/callback/discord
```

If Discord needs an exact fixed callback, set `DISCORD_REDIRECT_URI` explicitly.

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

This starts the app and Postgres together. The server waits for Postgres, runs the Drizzle migrations automatically, and then starts listening on `http://localhost:3000`.

For Docker Compose with Discord OAuth, the default callback is:

```bash
http://localhost:3000/api/auth/callback/discord
```

## Common Commands

```bash
npm run check      # Type-check client, shared code, and Vite config
npm run build:server
npm run build
npm test
npm run test:e2e
npm run start
```

## Project Layout

```text
src/common/      Shared game models, enums, and helpers
src/public/js/    Vue SFCs, client state, canvas helpers
src/public/style/ Global styles
src/public/static/ Static assets
src/server/      Express + Socket.IO server and game logic
test/e2e/        Browser coverage
test/server/     Server contract tests
```

## Contributing Notes

- Keep the UI mobile-friendly. Small screens should remain usable.
- The game is intentionally minimal. Avoid adding unnecessary rules or complexity.
- Game rooms are still in-memory, but auth and game history use Postgres when `DATABASE_URL` is configured.
- Realtime behavior should stay covered by server and browser tests.

## Support

Enjoy the game? Send a tip: [Ko-fi](https://ko-fi.com/krackocloud).

## License

GNU General Public License v3.0

## Credits

Notification SFX from [Material.io](https://material.io/design/sound/sound-resources.html) ([CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/))
