/**
 * Scans Cursor agent-transcripts, extracts user prompts, appends new ones
 * to docs/PROMPTS_ALL.md (and writes cursor-agent-prompts-export/all-prompts.json).
 *
 * Usage: node scripts/append-cursor-prompts.mjs
 * Env:   CURSOR_AGENT_TRANSCRIPTS — override transcript root
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');

const DEFAULT_TX =
  process.env.CURSOR_AGENT_TRANSCRIPTS ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.cursor',
    'projects',
    'd-BB-Project-bbplay',
    'agent-transcripts'
  );

function extractUserText(raw) {
  if (!raw) return '';
  const uq = raw.match(/<user_query>([\s\S]*?)<\/user_query>/i);
  if (uq) return uq[1].trim();
  return raw
    .replace(/<timestamp>[\s\S]*?<\/timestamp>\s*/gi, '')
    .replace(/\[Image\](?:\n\[Image\])*/g, '')
    .replace(/<image_files>[\s\S]*?<\/image_files>\s*/gi, '')
    .trim();
}

function getUserLines(text) {
  const content = text?.message?.content;
  if (!Array.isArray(content)) return '';
  return content.map((p) => p.text || '').join('');
}

function fileKeyForMd(sessionLabel, base, line) {
  return `${sessionLabel}|${base}|${line}`;
}

function listJsonlRecursive(dir, base = dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) listJsonlRecursive(p, base, acc);
    else if (name.name.endsWith('.jsonl')) acc.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return acc;
}

function walkTranscripts(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`Transcripts not found: ${root}`);
  }
  const files = listJsonlRecursive(root, root, []);
  files.sort();
  const out = [];
  for (const rel of files) {
    const full = path.join(root, rel);
    const relNorm = rel.split(path.sep).join('/');
    const parts = relNorm.split('/').filter(Boolean);
    if (parts.length < 2) continue;
    const sessionFolder = parts[0];
    const fileName = parts[parts.length - 1];
    const inSub = parts.includes('subagents');
    const sessionLabel = inSub ? 'subagents' : sessionFolder;
    const body = fs.readFileSync(full, 'utf8');
    const lines = body.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.role !== 'user') continue;
      const combined = getUserLines(obj);
      const prompt = extractUserText(combined);
      if (!prompt) continue;
      out.push({
        key: fileKeyForMd(sessionLabel, fileName, i + 1),
        sortKey: `${relNorm}\0${String(i + 1).padStart(8, '0')}`,
        sessionLabel,
        fileName,
        line: i + 1,
        relPath: relNorm,
        prompt,
      });
    }
  }
  return out;
}

function parseExistingKeys(md) {
  const keys = new Set();
  const re = /^## (\d+)\. session `([^`]+)` — ([^:]+):(\d+)\s*$/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    const sessionLabel = m[2];
    const fileName = m[3].trim();
    const line = parseInt(m[4], 10);
    keys.add(fileKeyForMd(sessionLabel, fileName, line));
  }
  return keys;
}

function countPromptsInMd(md) {
  const re = /^## (\d+)\. session `/gm;
  const nums = [];
  let m;
  while ((m = re.exec(md)) !== null) nums.push(parseInt(m[1], 10));
  return nums.length ? Math.max(...nums) : 0;
}

function codeFence(body) {
  if (!body.includes('```')) {
    return '```\n' + body + '\n```\n';
  }
  return '````\n' + body + '\n````\n';
}

function main() {
  const root = process.argv[2] || DEFAULT_TX;
  const all = walkTranscripts(root);
  all.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

  const mdPath = path.join(REPO, 'docs', 'PROMPTS_ALL.md');
  let md = fs.readFileSync(mdPath, 'utf8');
  const existing = parseExistingKeys(md);
  const newEntries = all.filter((e) => !existing.has(e.key));

  const outDir = path.join(REPO, 'cursor-agent-prompts-export');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'all-prompts.json'),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        transcriptRoot: path.resolve(root),
        totalScanned: all.length,
        alreadyInMd: all.length - newEntries.length,
        appended: newEntries.length,
        entries: all.map((e) => ({
          key: e.key,
          session: e.sessionLabel,
          file: e.fileName,
          line: e.line,
          relPath: e.relPath,
          text: e.prompt,
        })),
      },
      null,
      2
    ),
    'utf8'
  );

  if (newEntries.length === 0) {
    console.log('No new prompts. Total in transcripts:', all.length, '| In PROMPTS_ALL keys:', existing.size);
    return;
  }

  const lastN = countPromptsInMd(md);
  let n = lastN;
  const chunks = ['\n'];
  for (const e of newEntries) {
    n += 1;
    const header = `## ${n}. session \`${e.sessionLabel}\` — ${e.fileName}:${e.line}\n\n`;
    chunks.push(header, codeFence(e.prompt), '\n');
  }

  md = md.replace(
    /- \*\*всего промптов:\*\* \d+/,
    `- **всего промптов:** ${n}`
  );
  md = md.replace(
    /- \*\*сгенерировано:\*\* [^\n]+/,
    `- **сгенерировано:** ${new Date().toISOString()}`
  );
  if (!/- \*\*всего промптов:\*\*/.test(md)) {
    throw new Error('Could not find total count line in PROMPTS_ALL.md');
  }
  fs.writeFileSync(mdPath, md + chunks.join(''), 'utf8');
  console.log(
    `Appended ${newEntries.length} prompt(s). New total: ${n}. Transcript root: ${path.resolve(root)}`
  );
}

main();
