const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const VITE_ENV_REL = "src/vite-env.d.ts";
const EXCLUDE = new Set([VITE_ENV_REL.replace(/\//g, path.sep)]);

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === "target") continue;
      walk(full, out);
    } else if (e.isFile() && /\.(ts|tsx|js|jsx|rs)$/.test(e.name)) {
      if (EXCLUDE.has(rel)) continue;
      out.push({ rel, full });
    }
  }
  return out;
}

const files = [];
walk(path.join(ROOT, "src"), files);
const tauriSrc = path.join(ROOT, "src-tauri", "src");
if (fs.existsSync(tauriSrc)) walk(tauriSrc, files);

const violations = [];

function getScriptKind(ext) {
  switch (ext) {
    case ".ts": return ts.ScriptKind.TS;
    case ".tsx": return ts.ScriptKind.TSX;
    case ".js": return ts.ScriptKind.JS;
    case ".jsx": return ts.ScriptKind.JSX;
    default: return ts.ScriptKind.TS;
  }
}

function checkTsJs(filePath, content) {
  const ext = path.extname(filePath);
  const scriptKind = getScriptKind(ext);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, content, undefined, scriptKind);
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
      const start = scanner.getTokenPos();
      const end = scanner.getTextPos();
      const line = content.slice(0, start).split("\n").length;
      violations.push({ file: filePath, line, snippet: content.slice(start, end).trim().slice(0, 50) });
    }
    token = scanner.scan();
  }
}

function findRustCommentRanges(content) {
  const ranges = [];
  let i = 0;
  const n = content.length;
  let state = "normal";
  let rawHashCount = 0;
  let depth = 0;
  let multiStart = 0;

  while (i < n) {
    const c = content[i];
    const next = content[i + 1];

    if (state === "normal") {
      if (c === '"') {
        let j = i - 1;
        while (j >= 0 && content[j] === "#") j--;
        const isRaw = j >= 0 && content[j] === "r" && (j === 0 || /[\s(,=;:]/.test(content[j - 1]));
        if (isRaw) {
          rawHashCount = i - 1 - j - 1;
          if (rawHashCount < 0) rawHashCount = 0;
          state = "raw_string";
        } else {
          state = "double_string";
        }
        i++;
        continue;
      }
      if (c === "/" && next === "/") {
        const start = i;
        while (i < n && content[i] !== "\n") i++;
        ranges.push({ start, end: i });
        continue;
      }
      if (c === "/" && next === "*") {
        multiStart = i;
        i += 2;
        depth = 1;
        state = "multi_comment";
        continue;
      }
      i++;
      continue;
    }

    if (state === "double_string") {
      if (c === "\\" && i + 1 < n) {
        i += 2;
        continue;
      }
      if (c === '"') {
        state = "normal";
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (state === "raw_string") {
      if (c === '"') {
        let k = 0;
        while (i + 1 + k < n && content[i + 1 + k] === "#") k++;
        if (k === rawHashCount) {
          state = "normal";
          i += 1 + rawHashCount;
          continue;
        }
      }
      i++;
      continue;
    }

    if (state === "multi_comment") {
      if (c === "*" && next === "/") {
        depth--;
        if (depth === 0) {
          ranges.push({ start: multiStart, end: i + 2 });
          state = "normal";
          i += 2;
          continue;
        }
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        depth++;
        i += 2;
        continue;
      }
      i++;
    }
  }
  return ranges;
}

function checkRust(filePath, content) {
  const ranges = findRustCommentRanges(content);
  const lines = content.split("\n");
  for (const r of ranges) {
    const start = r.start;
    let lineNum = 1;
    let pos = 0;
    for (let L = 0; L < lines.length; L++) {
      const lineEnd = pos + lines[L].length + 1;
      if (lineEnd > start) {
        lineNum = L + 1;
        break;
      }
      pos = lineEnd;
    }
    const snippet = content.slice(start, r.end).trim().replace(/\n/g, " ").slice(0, 50);
    violations.push({ file: filePath, line: lineNum, snippet });
  }
}

files.forEach(({ rel, full }) => {
  const content = fs.readFileSync(full, "utf8");
  const ext = path.extname(full);
  if (ext === ".rs") {
    checkRust(rel, content);
  } else {
    checkTsJs(rel, content);
  }
});

if (violations.length > 0) {
  console.error("check:comments failed – comments found (no //, /* */, TODO, FIXME):");
  violations.forEach((v) => console.error(`  ${v.file}:${v.line}: ${v.snippet}`));
  process.exit(1);
}
console.log("check:comments OK");
