const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
new Function(src);
const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1];
console.log(JSON.stringify({
  syntax: 'ok',
  startsDoctype: html.startsWith('<!DOCTYPE html>'),
  endsHtml: html.trimEnd().endsWith('</html>') && html.endsWith('</html>') || html.endsWith('</html>\n'),
  title, h1,
  external: (html.match(/(src|href)=["'](https?:)?\/\//g) || []).length,
  bytes: html.length,
}));
