// Local studio server: serves the film, receives rendered frames, pipes them to ffmpeg.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8765);
const outDir = path.join(root, 'out');
const stillDir = path.join(outDir, 'stills');
fs.mkdirSync(stillDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'segs'), { recursive: true });

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
};

const segments = new Map();
const logs = [];

function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, code, data, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

function startSegment({ name, w, h, fps, crf = 14, master: masterFlag, yuv, from }) {
  if (yuv === '1') {
    // raw BT.709 4:2:0 frames, packed on the GPU; encoded offline
    const file = path.join(outDir, 'segs', `${name}.yuv`);
    const stream = fs.createWriteStream(file);
    const seg = { name, file, frames: 0, done: false, frameBytes: (w * h * 3) / 2, next: Number(from || 0), pending: new Map(), parts: new Map() };
    seg.write = (b) => stream.write(b);
    seg.drain = () => new Promise((r) => stream.once('drain', r));
    seg.end = () => new Promise((r) => stream.end(() => { seg.done = true; seg.code = 0; r(); }));
    segments.set(name, seg);
    return seg;
  }
  const file = path.join(outDir, 'segs', `${name}.mp4`);
  // master=1 writes a fast near-lossless 4:4:4 intermediate; the delivery encode happens offline.
  const master = masterFlag === '1';
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', 'pipe:0',
    '-vf', `vflip,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=${master ? 'yuv444p' : 'yuv420p'}`,
    ...(master
      ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '6']
      : ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-tune', 'grain']),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', file,
  ];
  const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  // frames may arrive out of order when the page keeps several uploads in flight
  const seg = { name, file, proc, frames: 0, done: false, frameBytes: w * h * 4, next: Number(from || 0), pending: new Map(), parts: new Map() };
  proc.on('exit', (code) => { seg.done = true; seg.code = code; });
  seg.write = (b) => proc.stdin.write(b);
  seg.drain = () => new Promise((r) => proc.stdin.once('drain', r));
  seg.end = () => { proc.stdin.end(); return new Promise((r) => (seg.done ? r() : proc.on('exit', r))); };
  segments.set(name, seg);
  return seg;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = Object.fromEntries(url.searchParams);
  try {
    if (req.method === 'POST' && url.pathname === '/log') {
      const msg = (await body(req)).toString();
      logs.push(`${new Date().toISOString().slice(11, 19)} ${msg}`);
      if (logs.length > 400) logs.shift();
      console.log('[page]', msg);
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/logs') return send(res, 200, logs.join('\n'), 'text/plain');
    if (req.method === 'POST' && url.pathname === '/still') {
      const buf = await body(req);
      const name = path.basename(q.name || `still-${Date.now()}.png`);
      fs.writeFileSync(path.join(stillDir, name), buf);
      return send(res, 200, { ok: true, file: path.join(stillDir, name) });
    }
    if (req.method === 'POST' && url.pathname === '/seg/start') {
      const old = segments.get(q.name);
      if (old && !old.done) await old.end();
      const seg = startSegment(q);
      return send(res, 200, { ok: true, file: seg.file });
    }
    if (req.method === 'POST' && url.pathname === '/seg/frame') {
      const seg = segments.get(q.name);
      if (!seg || seg.done) return send(res, 404, { ok: false, error: 'no segment' });
      let buf = await body(req);
      // large frames may arrive split into parts; assemble them before queueing the frame
      const parts = Number(q.parts || 1);
      if (parts > 1) {
        const key = Number(q.i);
        const got = seg.parts.get(key) || [];
        got[Number(q.part)] = buf;
        seg.parts.set(key, got);
        if (got.filter(Boolean).length < parts) return send(res, 200, { ok: true, frames: seg.frames });
        seg.parts.delete(key);
        buf = Buffer.concat(got);
      }
      if (buf.length !== seg.frameBytes) return send(res, 400, { ok: false, error: `bad size ${buf.length}` });
      seg.pending.set(Number(q.i), buf);
      while (seg.pending.has(seg.next)) {
        const b = seg.pending.get(seg.next);
        seg.pending.delete(seg.next);
        seg.last = seg.next++;
        seg.frames++;
        if (!seg.write(b)) await seg.drain();
      }
      return send(res, 200, { ok: true, frames: seg.frames });
    }
    if (req.method === 'POST' && url.pathname === '/seg/end') {
      const seg = segments.get(q.name);
      if (!seg) return send(res, 404, { ok: false });
      await seg.end();
      return send(res, 200, { ok: true, frames: seg.frames, code: seg.code });
    }
    if (url.pathname === '/status') {
      return send(res, 200, [...segments.values()].map(({ name, frames, done, last, code }) => ({ name, frames, done, last, code })));
    }
    // static
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(root, path.normalize(p));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'not found', 'text/plain');
    // byte ranges, so phones can stream video
    const size = fs.statSync(file).size, type = types[path.extname(file)] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    send(res, 500, { ok: false, error: String(err) });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`studio on http://127.0.0.1:${port}`));
