// 赛博鸡蛋's card art in the desktop app (gateway spec CE-API-9): the one bundle exported from the gateway's card
// definitions by the phone app's exporter (Aogiri `scripts/cyber-egg/export-art.ts`, format in ART-FORMAT.md),
// copied as it is into static/cyber-egg/art/. Nothing in it is edited here: change the web card, export again,
// run this again.
//
//   node scripts/sync-cyber-egg-art.mjs [--from <bundle's art/ folder>]
//
// Default source: ~/lynshen-wt/deliverables/网关/赛博鸡蛋/卡面资产/art. The app uses manifest.json, svg/, png/ and
// jpg/; app/ (the phone's packed copies) is left out.
import { cpSync, existsSync, readFileSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const at = process.argv.indexOf('--from');
const from = resolve(at > 0 ? process.argv[at + 1] : join(homedir(), 'lynshen-wt/deliverables/网关/赛博鸡蛋/卡面资产/art'));
const to = resolve('static/cyber-egg/art');
const manifest = JSON.parse(readFileSync(join(from, 'manifest.json'), 'utf8'));
if (manifest.format !== 'lynshen-cyber-egg-art' || manifest.version !== 1) throw new Error(`not a v1 card-art bundle: ${from}`);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const part of ['svg', 'png', 'jpg']) cpSync(join(from, part), join(to, part), { recursive: true });
copyFileSync(join(from, 'manifest.json'), join(to, 'manifest.json'));
const format = existsSync(join(from, 'ART-FORMAT.md')) ? join(from, 'ART-FORMAT.md') : join(dirname(from), 'ART-FORMAT.md');
if (existsSync(format)) copyFileSync(format, join(to, 'ART-FORMAT.md'));
const missing = [
	...manifest.cards.flatMap((c) => c.planes.map((p) => p.file)),
	...Object.values(manifest.frames),
	...Object.values(manifest.grounds).flatMap((g) => [g.svg, g.grain]),
	...manifest.packs.flatMap((p) => [p.back.svg, p.wrapper, p.thumbs])
].filter((file) => !existsSync(join(to, file)));
if (missing.length) throw new Error(`files the manifest names are missing: ${missing.slice(0, 5).join(', ')}`);
console.log(`cyber-egg art: ${manifest.cards.length} cards from ${manifest.source.repo} ${manifest.source.commit.slice(0, 8)}${manifest.source.dirty ? ' (dirty)' : ''} → ${to}`);
