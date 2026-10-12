
import { readFileSync, writeFileSync } from "fs";
const oldData = JSON.parse(readFileSync("old.json", "utf8"));
const newData = JSON.parse(readFileSync("new.json", "utf8"));
function rows(a, b, path) {
  const out = [];
  const aObj = a && typeof a === "object" && !Array.isArray(a);
  const bObj = b && typeof b === "object" && !Array.isArray(b);
  if (aObj && bObj) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out.push(...rows(a[key], b[key], path ? path + "." + key : key));
    }
    return out;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : [];
    const right = Array.isArray(b) ? b : [];
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
      const p = path + "[" + i + "]";
      if (i >= left.length) out.push({ kind: "added", path: p, value: right[i] });
      else if (i >= right.length) out.push({ kind: "removed", path: p, value: left[i] });
      else if (JSON.stringify(left[i]) !== JSON.stringify(right[i])) out.push({ kind: "changed", path: p, from: left[i], value: right[i] });
    }
    return out;
  }
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a === undefined) return [{ kind: "added", path, value: b }];
  if (b === undefined) return [{ kind: "removed", path, value: a }];
  return [{ kind: "changed", path, from: a, value: b }];
}
const escapeHtml = (value) => String(value).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
const changes = rows(oldData, newData, "");
const body = changes.map((row) => {
  const value = row.kind === "changed" ? escapeHtml(JSON.stringify(row.from)) + " -> " + escapeHtml(JSON.stringify(row.value)) : escapeHtml(JSON.stringify(row.value));
  return '<li class="' + row.kind + '"><code>' + escapeHtml(row.path) + '</code> ' + value + '</li>';
}).join("\n");
const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Diff report</title>
<style>
body { font-family: sans-serif; }
.added { color: green; }
.removed { color: red; }
.changed { background: yellow; }
</style>
</head>
<body>
<h1>Diff report</h1>
<p>Color coding: green added, red removed, yellow changed.</p>
<ul>
${body}
</ul>
</body>
</html>
`;
writeFileSync("diff-report.html", html);
