# Native asset provenance

The code is MIT licensed. Third-party assets retain their original licenses.
No account or network connection is needed to play the packaged game.

## The Glass Choir / industrial environment

- Source: https://github.com/godotengine/tps-demo
- Commit: `a82f15448e9b015440d3bbdf5e10801b260c4e9f`.
- Art: Juan Linietsky and Fernando Miguel Calabró, CC BY 3.0.
- Music: Christian Fernando Perucchi, CC BY 3.0.
- Preserve `licenses/GODOT-TPS-LICENSE.md`, including GameTextures.com material credits.
- Scenes/material paths rebased under `third_party/tps`; lighting/exposure changed;
  new navigation, actors, objective placement and effects. Binary core material keeps
  its original path alias under `level/textures/structure/Core`.
- Reproduce the dependency copy with `tools/import-tps-assets.py`.

## The Glass Choir / human cast

- Generator: https://github.com/olatunde85/3d-gen, MIT, Josh Ola and contributors.
- Downloaded main on 2026-11-13; upstream HEAD checked as
  `3a9fca61fc1ea081a2d252fcdd588023d1c10587`.
- MakeHuman base data: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`;
  system assets: https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- Character data: CC0. Generator code/procedural animation: MIT. Locomotion and jump
  include CMU motion capture under its separate terms (free use including commercial
  games; no direct resale of the motion data). Preserve `licenses/ARA-ASSETS-LICENSE.txt`
  and `licenses/ARA-MIT-LICENSE.txt`.
- The data used in this project was obtained from mocap.cs.cmu.edu. The database was
  created with funding from NSF EIA-0196217.
- `assets/cast/*.json` contains the adult character parameters. Exported GLBs include
  embedded textures, a game skeleton and selected combat/locomotion clips.
- To reproduce: prepare Ara's source assets, copy `tools/generate-cast.ts` into Ara's
  `scripts/`, then run `npx tsx scripts/generate-cast.ts <cast-output-directory>`.
  On Windows, normalize both target-key `relative(...)` results in `build-assets.ts`
  using `.replaceAll('\\', '/')` before removing the `.target` suffix. Otherwise
  Ara's slash-based target names do not match Windows paths.
- Protagonist clothing/colors and casting were customized; no real person's identity
  or photographs were supplied. The old Higgsfield characters below belong to the
  retained legacy prototype, not the new mission.

## The Glass Choir / generated dialogue

- 27 speech clips in `voice/` are generated for this fictional cast using
  https://huggingface.co/hexgrad/Kokoro-82M (model license: Apache 2.0).
- Runtime used to generate the audio: https://github.com/thewh1teagle/kokoro-onnx,
  version 0.4.7, MIT. Model/voice bank: upstream `model-files-v1.1` release.
- Built-in voices: Ena `af_heart`, Aro `am_michael`, Mara `bf_emma`, Voss `bm_george`.
  These are synthetic voices, not recordings or clones of the game's actors.
- Source dialogue and generation settings: `tools/generate-dialogue.py`.
  `voice/lines.json` records text, duration, amplitude envelopes and file hashes.
- Audio normalized and encoded as 24 kHz Ogg Vorbis. Only generated audio ships;
  ONNX weights, Python dependencies and eSpeak binaries are development tools.
- Preserve `licenses/KOKORO-ONNX-LICENSE.txt` and `licenses/KOKORO-MODEL-LICENSE.txt`.
  Facial speech animation is amplitude driven; no performance capture was used.

## Powered by Poly Haven assets

- `terrain/ground_*`: **forest_ground_04**, 2K diffuse, OpenGL normal and roughness maps.
- `environment/boulder_01`: **boulder_01**, 1K glTF photogrammetry model and PBR textures.
- `environment/dead_tree_trunk`: **dead_tree_trunk**, 1K glTF photogrammetry model and PBR textures.
- License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
- Sources: https://polyhaven.com/a/forest_ground_04, https://polyhaven.com/a/boulder_01,
  https://polyhaven.com/a/dead_tree_trunk
- Files retrieved through https://api.polyhaven.com/files/ on 2026-11-13 UTC.
- Ground colors, object scales and placements are changed by the game.

## Kenney Impact Sounds

- `audio/*.ogg`: 25 recordings from **Impact Sounds**, by Kenney.
- License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
- Original source: https://kenney.nl/assets/impact-sounds
- Download mirror: https://github.com/GeorgeQLe/assets-sfx-combat/tree/main/assets/kenney/impact-sounds
- Unmodified audio files; pitch, spatial attenuation and gain vary during playback.

## Aro and Ena — AI-generated original characters

- `characters/aro.glb`, `characters/ena.glb` and idle animation files are generated
  for this project through Higgsfield using Tripo 3D and Meshy rigging/animation.
- Direction: adult human-like alien immortals, natural facial proportions,
  silver/cyan armor and braided silver hair for Ena, bronze/amber armor and
  short dark hair for Aro; fully clothed, separated limbs suitable for rigging.
- Generation date: 2026-11-13 UTC. No photographs of real people were used.
- Geometry job IDs: Ena `ab30ba44-ade4-48c3-97cd-f602f5cd7a69`,
  Aro `f17f306d-c21b-4f49-89b7-90be47388290`.
- Run rig IDs: Ena `0ade5388-b6cc-49cc-9e6d-351db351f0cd`,
  Aro `67a630f5-fb06-4147-bd37-7746277dad5a`.
- Idle rig IDs: Ena `95d12be8-c151-4edc-b474-89a05ab2bfe6`,
  Aro `65966cf6-6822-4895-a5f7-901ac3981577`.
- Source geometry was rotated from +X to +Z before rigging. Idle clips are
  retargeted to the run rigs using inverse bind matrices. Runtime texture imports
  are limited to 2K; the original 4K textures are retained in the source files.
- Animation library actions: RunFast (16), Idle (0).
- The project distributes these original outputs under its MIT license to the
  extent the project owner holds rights in them. They are AI-generated outputs,
  not third-party CC0 scans. No guarantee of copyright protection is made.
- Provider terms checked at creation:
  https://higgsfield.ai/terms-of-use-agreement (sections 4.4 and 8),
  https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models
- The account used paid credits. Higgsfield does not claim ownership of outputs
  or restrict their commercial use. Provider service access is not included.

## Godot Engine

Godot 4.7.2 is MIT licensed. The Windows release includes Godot's license and
third-party copyright notices in `licenses/`. https://godotengine.org/license/
