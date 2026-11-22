# Asset credits

## PBR surface textures (`public/assets/pbr/`, gfx-materials)
All CC0 (public domain). Downloaded at 1K, then de-tiled, colour-calibrated and packed to WebP by `tools/bake_pbr.py`.

| Game layer | Source asset | Site |
|---|---|---|
| asphalt | asphalt_02 | Poly Haven — https://polyhaven.com/a/asphalt_02 |
| sidewalk | asphalt_04 | Poly Haven — https://polyhaven.com/a/asphalt_04 |
| granite (Sierra White) | Granite002A | ambientCG — https://ambientcg.com/view?id=Granite002A |
| brick | brick_wall_006 | Poly Haven — https://polyhaven.com/a/brick_wall_006 |
| lawn | leafy_grass | Poly Haven — https://polyhaven.com/a/leafy_grass |
| drygrass | withered_grass | Poly Haven — https://polyhaven.com/a/withered_grass |
| litter | forest_leaves_02 | Poly Haven — https://polyhaven.com/a/forest_leaves_02 |
| dirt | park_dirt | Poly Haven — https://polyhaven.com/a/park_dirt |
| stucco | white_stucco | Poly Haven — https://polyhaven.com/a/white_stucco |
| boardconc (board-formed concrete) | wood_textured_concrete | Poly Haven — https://polyhaven.com/a/wood_textured_concrete |
| concrete | concrete_wall_004 | Poly Haven — https://polyhaven.com/a/concrete_wall_004 |
| siding | wood_plank_wall | Poly Haven — https://polyhaven.com/a/wood_plank_wall |
| rooftile (terracotta) | roof_09 | Poly Haven — https://polyhaven.com/a/roof_09 |
- `fonts/inter-latin-wght.woff2`: Inter (variable, Latin subset) by Rasmus Andersson, SIL Open Font License 1.1. https://github.com/rsms/inter (via @fontsource-variable/inter)
- UI icons in `src/ui/icons.js`: mostly derived from Lucide (ISC licence, https://lucide.dev); movement glyphs drawn for this project.
- `horse/horse.glb` — "Horse" from the Ultimate Animated Animal Pack by Quaternius (https://quaternius.com, via https://poly.pizza/m/qvTrSG9pZF), CC0 1.0 (public domain). Unused animations pruned with glTF-Transform; recoloured, re-shaded and fitted with procedural tack at runtime (src/player/modes/horse-rig.js).

## Sculptures (r4-props)
- `sculpt/lion-*.bin`: Durant Hall guardian lions, an original procedural SDF sculpt baked by `tools/sculpt/guardian-lion.mjs` (no third-party mesh or texture). Modelled from the reference photo "Durant Hall lion statues - 2015-07-25" by James Lin (CC BY-SA 4.0, Wikimedia Commons), used for reference only and not shipped.
- `people/female.glb`, `people/male.glb`, `people/hair.glb` — bodies (Superhero female/male), hairstyles and eyebrows from "Universal Base Characters [Standard]" by Quaternius (https://quaternius.com/packs/universalbasecharacters.html), CC0 1.0. Repacked by `tools/people_build.mjs` (webp textures, pruned); slimmed, dressed and propped at runtime (src/people/).
- `people/anims.bin` — 15 motion clips (idle, talking, walk, formal walk, jog, sitting, sitting talk, hit reaction, ...) from "Universal Animation Library [Standard]" by Quaternius (https://quaternius.com/packs/universalanimationlibrary.html), CC0 1.0. Extracted and key-reduced by `tools/people_anims.mjs`.
- People clothing and accessories (r4-people2) are generated at runtime, with no new asset files: garment shells, straps, shoes, bags, hats, glasses, headphones and head-built hair are made from the CC0 Quaternius UBC body meshes above (src/people/garments.js, src/people/kit.js). Chest prints are drawn on a canvas with system fonts.
- `sculpt/bear-*.bin`, `sculpt/rock-slab*.bin`, `sculpt/pelican*.bin` (r4-props2): the campus bear statues (Tom Hardy's Golden Bear, Raymond Puccinelli's Grizzly Bear, Douglas Van Howd's California Golden Bear, Jo Mora's mourning bears on the Class of 1920 bench), their rock base, and Frances Rich's Laughing Pelican. All original procedural SDF sculpts baked by `tools/sculpt/bears.mjs` and `tools/sculpt/pelican.mjs` (no third-party mesh or texture). Reference photos used for modelling only, not shipped: Wikimedia Commons (Daderot, public domain / CC0: "Grizzly Bear by Raymond Puccinelli", "Bench at Sather Tower - Class of 1920 bench", "Bench at Sather Tower - Class of 1955 bench", "Pelican sculpture at Anthony Hall"), Wally Gobetz on Flickr (Golden Bear, Lower Sproul), I-House Berkeley blog (Van Howd bear).
- People (near LOD, r4-people3): 20 avatars from Microsoft Rocketbox Avatar Library (github.com/microsoft/Microsoft-Rocketbox), MIT License, Copyright (c) Microsoft Corporation. Converted from Assets/Avatars/*/Export/*.fbx with FBX2glTF, textures downsized to WebP, geometry meshopt-compressed (tools/people_rb_build.mjs). Animations are the CC0 Quaternius UAL clips retargeted at load (src/people/rocketbox.js).
