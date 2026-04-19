#!/usr/bin/env node
/**
 * Собирает текстовые запросы пользователя к Agent из локальных транскриптов Cursor.
 * Источник: %USERPROFILE%\.cursor\projects\<slug>\agent-transcripts\**\*.jsonl
 *
 * Использование:
 *   node scripts/export-cursor-agent-prompts.mjs
 *   node scripts/export-cursor-agent-prompts.mjs --out ./my-export
 *   node scripts/export-cursor-agent-prompts.mjs --transcripts "C:\Users\you\.cursor\projects\d-BB-Project-bbplay\agent-transcripts"
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/** Как Cursor именует папку проекта (наблюдаемое поведение для Windows-путей). */
function cursorProjectDirName(workspaceRoot) {
  const abs = path.resolve(workspaceRoot);
  const normalized = abs.replace(/\\/g, '/');
  const win = /^([a-zA-Z]):\/?(.*)$/.exec(normalized);
  if (win) {
    const drive = win[1].toLowerCase();
    const segments = win[2]
      .split('/')
      .filter(Boolean)
      .map((s) => s.replace(/_/g, '-'));
    return [drive, ...segments].join('-');
  }
  const segments = normalized
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/_/g, '-'));
  return segments.join('-') || 'workspace';
}

function defaultTranscriptsDir(workspaceRoot) {
  const slug = cursorProjectDirName(workspaceRoot);
  return path.join(os.homedir(), '.cursor', 'projects', slug, 'agent-transcripts');
}

function parseArgs(argv) {
  const out = { workspace: process.cwd(), outDir: null, transcripts: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--workspace' || a === '-w') {
      out.workspace = path.resolve(argv[++i] ?? '');
    } else if (a === '--out' || a === '-o') {
      out.outDir = path.resolve(argv[++i] ?? '');
    } else if (a === '--transcripts' || a === '-t') {
      out.transcripts = path.resolve(argv[++i] ?? '');
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/export-cursor-agent-prompts.mjs [options]

Options:
  -w, --workspace <dir>   Корень открытого в Cursor проекта (default: cwd)
  -t, --transcripts <dir>   Папка agent-transcripts (default: ~/.cursor/projects/<slug>/agent-transcripts)
  -o, --out <dir>         Куда сохранить (default: <workspace>/cursor-agent-prompts-export)
`);
      process.exit(0);
    }
  }
  if (!out.outDir) {
    out.outDir = path.join(out.workspace, 'cursor-agent-prompts-export');
  }
  if (!out.transcripts) {
    out.transcripts = defaultTranscriptsDir(out.workspace);
  }
  return out;
}

function collectJsonlFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const st = fs.statSync(dir);
  if (!st.isDirectory()) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const s = fs.statSync(full);
    if (s.isDirectory()) collectJsonlFiles(full, acc);
    else if (name.endsWith('.jsonl')) acc.push(full);
  }
  return acc;
}

function textFromUserMessage(obj) {
  if (obj?.role !== 'user' || !obj.message?.content) return null;
  const parts = obj.message.content;
  if (!Array.isArray(parts)) return null;
  const texts = [];
  for (const p of parts) {
    if (p?.type === 'text' && typeof p.text === 'string') texts.push(p.text);
  }
  if (texts.length === 0) return null;
  return texts.join('\n');
}

/** Внутренность <user_query>…</user_query>, иначе весь текст. */
function extractPrompt(raw) {
  const m = raw.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  if (m) return m[1].trim();
  return raw.trim();
}

function main() {
  const { workspace, outDir, transcripts } = parseArgs(process.argv);

  if (!fs.existsSync(transcripts)) {
    console.error(
      `Папка транскриптов не найдена:\n  ${transcripts}\n\n` +
        `Укажите путь явно: --transcripts "…\\.cursor\\projects\\<slug>\\agent-transcripts"\n` +
        `Ожидаемый slug для этого workspace (${workspace}): ${cursorProjectDirName(workspace)}`
    );
    process.exit(1);
  }

  const files = collectJsonlFiles(transcripts);
  files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  const entries = [];
  let globalIndex = 0;

  for (const file of files) {
    const sessionId = path.basename(path.dirname(file));
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    let lineNo = 0;
    for (const line of lines) {
      lineNo++;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const fullText = textFromUserMessage(obj);
      if (fullText == null) continue;
      const prompt = extractPrompt(fullText);
      if (!prompt) continue;
      globalIndex++;
      entries.push({
        index: globalIndex,
        sessionId,
        sourceFile: file,
        line: lineNo,
        prompt,
      });
    }
  }

  fs.mkdirSync(outDir, { recursive: true });

  const txtPath = path.join(outDir, 'all-prompts.txt');
  const jsonPath = path.join(outDir, 'all-prompts.json');

  const textBlocks = entries.map((e) => {
    return (
      `\n${'='.repeat(72)}\n` +
      `# ${e.index}  session ${e.sessionId}  (${path.basename(e.sourceFile)}:${e.line})\n` +
      `${'-'.repeat(72)}\n` +
      `${e.prompt}\n`
    );
  });

  const header =
    `Экспорт запросов к Agent (Cursor)\n` +
    `workspace: ${workspace}\n` +
    `transcripts: ${transcripts}\n` +
    `всего промптов: ${entries.length}\n` +
    `сгенерировано: ${new Date().toISOString()}\n`;

  fs.writeFileSync(txtPath, header + textBlocks.join(''), 'utf8');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        workspace,
        transcriptsDir: transcripts,
        exportedAt: new Date().toISOString(),
        count: entries.length,
        prompts: entries.map(({ index, sessionId, sourceFile, line, prompt }) => ({
          index,
          sessionId,
          sourceFile,
          line,
          prompt,
        })),
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Готово: ${entries.length} промптов`);
  console.log(`  ${txtPath}`);
  console.log(`  ${jsonPath}`);
}

main();
