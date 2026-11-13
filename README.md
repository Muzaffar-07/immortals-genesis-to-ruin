# Immortals: Genesis to Ruin

A free, open-source 2D browser action game about Aro and Ena, two immortals who journey from the first morning to the end of creation—and back again.

**[Play the game](https://immortals-genesis-to-ruin.vercel.app)** · [Source on GitHub](https://github.com/Muzaffar-07/immortals-genesis-to-ruin)

Six playable chapters feature procedural Canvas 2D art, dynamic lighting, bloom, particles, weather, cinematic space scenes, companion combat, rebirth, and a final boss. All chapters are available from the title screen.

## Play locally

Requires Node.js 20 or newer. No runtime dependencies or build step.

```sh
npm start
```

Open http://localhost:4173 in a modern desktop browser. Use a keyboard and mouse. Click the game to focus keyboard input.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim |
| Left click / J | Strike |
| Space / Shift | Dash |
| Q | Swap Aro (melee) and Ena (ranged) |
| E (hold) | Interact |
| F | Communion, when charged |
| P | Pause / resume |

Choose Story, Balanced, or Relentless difficulty and toggle bloom and screen shake using the toolbar. A fallen character revives after five seconds; losing both characters or a mission objective ends the attempt.

## Chapters

1. **First Breath** — Gather the Maker's light and defeat the Shades.
2. **The First Flame** — Discover fire and defend it until dawn.
3. **The Long Ages** — Defend the Beacon through Stone, Iron, and Engines.
4. **Earthfall** — Break containment pylons and escape Earth.
5. **The Dying Stars** — Rescue seven seeds before a world breaks.
6. **The End of Making** — Face the Unmaking and return through time.

## Tests

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

The simulation test exercises all six chapter win paths on Story and Relentless, rebirth, the epilogue, and failure/retry paths. It uses a scripted player with assisted objective completion and survival, so it does not establish gameplay balance. The browser test starts its own local server and checks actual rendering, menus, chapter entry, input, pause/resume, and responsive sizing.

An optional GitHub Actions workflow is provided in `docs/github-actions-test.yml`. To enable CI, copy it to `.github/workflows/test.yml` using a GitHub credential with workflow permission.

## Hosting

Serve the `public/` directory with any static web host. `vercel.json` configures Vercel's output directory. No backend, API keys, database, or Claude account is required. Google Fonts is optional; system fonts are used if it is unavailable.

## Source

- `public/game.js`: original game logic and procedural rendering.
- `public/index.html`: screens and HUD templates.
- `public/runtime.js`: standalone property-binding renderer replacing the artifact host.
- `public/app.js` and `public/site.css`: browser startup, settings, fullscreen and scaling.
- `tests/`: simulation and browser checks.

The concept was created by Muzaffar Ali Mohammad. The initial game was developed with Claude as **Immortals: Genesis to Ruin**, then adapted with Codex for standalone hosting. No proprietary artifact runtime is bundled. Visual assets are drawn procedurally. This is a 2D prototype, not a console-grade 3D game.

Current limitations: no sound, touch/gamepad controls, saved progress, or multiplayer. Contributions improving accessibility, performance, controls, balance, and audio are welcome. Please describe changes and run relevant tests in pull requests. Do not commit secrets or assets you cannot redistribute.

## License

MIT. See [LICENSE](LICENSE).
