// Scaffold a new episode from templates/episode.
// Usage: node tools/new-episode.mjs 003-defense-mechanisms "防御机制"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, title] = process.argv.slice(2);
if (!id || !title) { console.log('usage: node tools/new-episode.mjs <id> "<标题>"'); process.exit(1); }
const dst = path.join(ROOT, 'episodes', id);
if (fs.existsSync(dst)) { console.error(`episodes/${id} already exists`); process.exit(1); }
fs.mkdirSync(path.join(dst, 'copy'), { recursive: true });
const src = path.join(ROOT, 'templates/episode');
for (const f of fs.readdirSync(src)) {
  fs.writeFileSync(path.join(dst, f), fs.readFileSync(path.join(src, f), 'utf8').replaceAll('__ID__', id).replaceAll('__TITLE__', title));
}
fs.copyFileSync(path.join(ROOT, 'templates/copy-brief.md'), path.join(dst, 'copy/brief.md'));
console.log(`episodes/${id} ready — next: write copy/brief.md, run Argon, fill subs.json`);
