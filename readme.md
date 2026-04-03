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
- The app is in-memory only, with no database.
- Realtime behavior should stay covered by server and browser tests.

## Support

Enjoy the game? Send a tip: [Ko-fi](https://ko-fi.com/krackocloud).

## License

GNU General Public License v3.0

## Credits

Notification SFX from [Material.io](https://material.io/design/sound/sound-resources.html) ([CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/))
