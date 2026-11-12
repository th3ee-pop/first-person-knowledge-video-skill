// Serve one video and one cover to the 小红书 creator page on this machine only, so a page script can pick them up.
// (The Chrome extension's own file upload stops at 10 MB.)
//   node serve-upload.mjs <video.mp4> <cover.jpg> [port=8765]
// Listens on 127.0.0.1 only, answers only /v.mp4 and /c.jpg, allows only the creator page's origin, and exits after 20 minutes.
//
// Then, in the publish page (https://creator.xiaohongshu.com/publish/publish), run in the page:
//   const b = await (await fetch('http://127.0.0.1:8765/v.mp4')).blob();
//   const f = new File([b], '<标题>.mp4', { type: 'video/mp4' });
//   const dt = new DataTransfer(); dt.items.add(f);
//   const input = document.querySelector('input[type=file]');
//   input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
// For the cover: hover the cover thumbnail → 编辑封面 → do the same with /c.jpg ('image/jpeg') on that dialog's file input.
import http from 'node:http';
import fs from 'node:fs';

const [video, cover, port = '8765'] = process.argv.slice(2);
if (!video || !cover) { console.error('usage: node serve-upload.mjs <video.mp4> <cover.jpg> [port]'); process.exit(1); }
for (const f of [video, cover]) if (!fs.existsSync(f)) { console.error('not found: ' + f); process.exit(1); }
const files = { '/v.mp4': [video, 'video/mp4'], '/c.jpg': [cover, 'image/jpeg'] };

http.createServer((req, res) => {
  const h = { 'Access-Control-Allow-Origin': 'https://creator.xiaohongshu.com', 'Access-Control-Allow-Private-Network': 'true' };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  const hit = files[req.url];
  if (!hit) { res.writeHead(404, h); return res.end(); }
  res.writeHead(200, { ...h, 'Content-Type': hit[1], 'Content-Length': fs.statSync(hit[0]).size });
  fs.createReadStream(hit[0]).pipe(res);
}).listen(Number(port), '127.0.0.1', () => console.log(`ready on http://127.0.0.1:${port} (exits in 20 min)`));
setTimeout(() => process.exit(0), 20 * 60 * 1000);
