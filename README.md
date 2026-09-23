# all the way down

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

Open http://127.0.0.1:8765/. Space pauses, the arrow keys skip 3 seconds, and `R` picks a new
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

## License

MIT
