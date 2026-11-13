# Immortals: The Glass Choir

A downloadable Godot action thriller set inside Blackwater, a facility harvesting
immortality. Play as adult alien immortals Ena or Aro, investigate human copies,
rescue Dr. Mara Vale and confront Director Voss. This is a playable development
slice, not a finished AAA game or a PlayStation release.

## Play

[Download the Windows build](https://github.com/Muzaffar-07/immortals-genesis-to-ruin/releases/tag/v0.4.0-glass-choir).
Extract the entire ZIP, then run `Immortals.exe`. Keep `Immortals.pck` beside it.
No installation, login or internet connection is needed. The executable is unsigned.

Windows x64, keyboard and mouse, Vulkan graphics. The compatibility launcher uses
OpenGL with reduced effects. Full HD is the default 1920×1080 rendering resolution;
Performance uses a lower 3D resolution, while 4K supersampling renders the 3D scene
at 3840×2160 and scales it to the viewport. This does not make every source texture
4K. A GTX 1650 Ti was used for visual checks, not a broad hardware benchmark.

| Input | Action |
|---|---|
| WASD / mouse | Move / look |
| Shift / C | Sprint / jump |
| Left click | Three-step combo: punches, front kick, roundhouse |
| Right click | Block; press within 0.2 s of impact for a perfect parry |
| Space | Evade with a brief invulnerability window |
| Tab | Lock nearest visible target |
| Q | Blink strike: 16 m range, 5 s cooldown, stamina cost |
| R | Gravity pull: 9 m range, 9 s cooldown, resonance cost |
| F | Time fracture: slow enemies for 6 s when resonance is full |
| E | Investigate, converse, use freight lift or extract |
| M / Escape | Evidence journal / pause |

Watch orange windups. Blocks consume stamina; perfect parries stagger the attacker.
Successful strikes build resonance. Kills restore some vitality. Blood effects can
be disabled. Both heroes have equal combat statistics.

## Mission

1. **Afterimage** — investigate a recorder carrying your own voice.
2. **Cut the Lights** — descend to Security, defeat guards and disable the junction.
3. **The Witness** — find Mara and decide whether to trust her with the console.
4. **Clean Sweep** — survive a containment ambush; the witness choice changes its size.
5. **The King's Lie** — broadcast the evidence or destroy the research archive.
6. **The Glass Choir** — defeat Voss; preserving the archive leaves him stronger.
7. **Daybreak** — extract and see the consequences of both decisions.

Freight lifts connect the three decks with short transitions. Checkpoints restart
the current objective and restore choices, rather than snapshotting combat.
Saves live in Godot's user application directory as `glass-choir.json`.

## Development

Open `project.godot` in Godot 4.7.2. Bundled assets require no generation service.

```powershell
godot --headless --path native --editor --import
godot --headless --path native -- --cinematic-test
godot --path native
```

The automated integration check covers both heroes, combat animations, timed combo
damage, block/parry/evade, gravity and blink cooldowns, time fracture, dialogue button
choices, ambush and boss consequences, both endings, pause, death and checkpoint retry.
Story tests assist combat and relocate the player between objectives; they do not
establish difficulty balance. `--cinematic-capture` renders title/gameplay/combat
screenshots into `test-output/`. Test modes do not overwrite player saves.

`tools/build-native.ps1` exports Windows, packages the executable and data, copies
credits/licenses and prints a SHA256 checksum. Matching Godot export templates are
required. Build output and tools/downloads are ignored by git.

The former six-arena prototype remains accessible through `main.tscn` for reference.
The browser prototype is a separate game in `public/`.

## Open-source sources and limitations

Game code: MIT. Environment and music: Godot TPS Demo, CC BY 3.0 with the full
notice in `licenses/GODOT-TPS-LICENSE.md`. Characters use the MIT Ara 3D Gen pipeline
and CC0 MakeHuman data. Motion-capture locomotion retains CMU's terms and credit.
Kenney sound effects are CC0. See `assets/ATTRIBUTION.md` and `licenses/`.

This build has one mission with linked stages, limited enemy tactics and keyframed
combat animation. Conversations are text/subtitles, not recorded voice acting.
There is no multiplayer, controller support, facial performance capture, destructible
world, dismemberment system, console certification or guaranteed 4K frame rate.
