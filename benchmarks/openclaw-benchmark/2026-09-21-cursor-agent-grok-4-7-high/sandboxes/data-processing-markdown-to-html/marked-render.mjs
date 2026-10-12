
import { readFileSync, writeFileSync } from "fs";
const { marked } = await import(process.env.VENDOR + "/node_modules/marked/lib/marked.esm.js");
const body = await marked.parse(readFileSync("README.md", "utf8"));
const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Project Title</title>
<style>
body { font-family: Georgia, serif; max-width: 42rem; margin: 2rem auto; }
pre { background: #0f172a; color: #e2e8f0; padding: 1rem; overflow: auto; }
code { font-family: ui-monospace, monospace; }
pre code.language-bash { color: #67e8f9; }
pre code.language-javascript { color: #f9a8d4; }
</style>
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync("output.html", html);
