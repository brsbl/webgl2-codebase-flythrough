# WebGL2 Codebase Flythrough

A 45-second looping flight through a building made of source code, drawn with WebGL2 for
[bb](https://getbb.app). Every surface is typeset from `film.js`'s own text, so up close you
can read the code that renders it.

The building assembles itself just ahead of the camera: far ahead it is a blue plan, then
blank slabs fly into place, agents (the orange lights) type them line by line, and finished
slabs flash green. The whole scene is one file, `film.js`, with no 3D models or libraries.

## Watch it live

```sh
node server.mjs
```

Then open `127.0.0.1:8765` in a browser. Space pauses, the arrow keys skip 3 seconds, and `R` picks a new
random seed.

`film.js` loads its own source to draw on the slabs, so it needs to be served over HTTP;
opening `index.html` from disk will not work.

## Render video

`render.html` draws exact frames at any resolution and streams them to `server.mjs`, which
writes raw `yuv420p` chunks that ffmpeg encodes as they land.

Requirements: macOS, zsh, Node, ffmpeg, and the [bb](https://getbb.app) CLI with the Browser
Automation plugin (it provides the headless Chrome that renders frames). Set `BB_MACHINE` to
your bb host ID if you have more than one.

```sh
node server.mjs &

# 1080p60, x264
./render-film.sh film1080 1920 1080 60 450 7

# 4K60, using the hardware encoder so the CPU stays free for rendering
CODEC='-c:v h264_videotoolbox -b:v 160M' ./render-film.sh film2160 3840 2160 60 150 7
```

Arguments are `<name> <width> <height> <fps> [chunk frames] [seed]`. Output lands in `out/`.

For individual stills: `./stills.sh <prefix> <times>`, for example `./stills.sh s 4,12,19`
writes PNGs to `out/stills/`.

`watch.html` is a bare player for an encoded file at `out/film-web-v7-4k.mp4`.

## Adapting it

A built-in mode for exploring your own codebase is coming to this repo soon. Until then, here
is how to adapt it yourself.

### Show your own code

`makeAtlas()` in `film.js` loads the text for every surface with
`fetch(new URL('./film.js', import.meta.url))`. Point that at your own file, or at a
concatenation of files, and the building is typeset from your code instead.

- Syntax colouring is tuned for JavaScript and GLSL. Adjust the `KW` keyword set and the
  `tokens()` regex for other languages.
- The text atlas holds about 1,600 lines of up to 92 characters. Shorter sources repeat;
  longer ones are cut off.

### Turn it into a walkthrough of your codebase

As written, the film uses code only as a texture. `buildWorld()` places the canyon, towers,
and ~27k slabs from a random seed, each slab shows an arbitrary run of lines, and `camera(t)`
flies a fixed 45-second loop. To map the building to a real codebase:

1. **Index the repository.** Write a small script that walks the repo and outputs JSON: the
   directory tree, each file's path and line count, and its text (or a URL to fetch it).
2. **Lay out from the index.** Replace the procedural placement in `buildWorld()` with
   positions derived from the JSON, for example one tower or district per directory and one
   stack of slabs per file, sized by line count. Keep each slab's per-instance data in the same
   shape so the existing shaders keep working.
3. **Give each file its own lines.** Instead of one looping atlas, build several atlases (or
   load text on demand for what is near the camera) and store which atlas and starting line each
   slab reads from.
4. **Add navigation.** Replace `camera(t)` with free-fly or click-to-fly controls, and draw a
   label for each directory and file so people can find their way.

The shaders, the text rendering on each face, and the plan → build → type → done stages can
stay as they are.

## License

MIT
