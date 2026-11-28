# Tag Colours

An [axidps](https://github.com/darkharasho/axidps) plugin that makes the game's commander tags,
squad markers and target markers easier to tell apart: recolour them (a colour-blind-friendly
palette, one colour for every tag, or your own), outline them, put a ring behind them, or make
them bigger.

It needs axidps's `textures` permission, which only verified plugins get.

## Settings

- **Preset**: the game's colours, Colour-blind (Okabe-Ito), one colour for every commander tag,
  or Custom (start from what's shown and change any icon).
- **Tags / Markers / Targets**: switch each group on or off, and each icon in it.
- **Colour**: Shaded keeps the icon's shading; Tinted keeps its lightness; Flat fills it.
- **Outline**: round, sharp or double, its width (on the world and on the minimap) and colour.
- **Ring** behind each icon, and **Size**. Each icon grows only as far as its own picture has
  room: past that axidps stops, so it is never cut off (needs axidps 0.2.0-rc.16 or later).

Markers, chevrons and badges show in grey in the list until their colours are read from the game;
in game they keep the game's own colours unless you choose one.

Changes apply in the game at once. On axidps 0.2.0-rc.21 or later, **Pop out** on its page shows
just the settings in a small window beside the game, so you can watch the icons change.

## Thanks

The idea, and the list of the game's icon textures axidps restyles, come from the
Commander Tag Accessibility addon. axidps turns itself off while that addon is loaded.

## Developing

`node --test` runs the tests. With `AXIDPS_SDK=<axidps>/apps/axidps-overlay/sdk/axidps.js` set,
they also check every icon name against axidps's list.
