import { access } from 'node:fs/promises'

for (const file of ['index.html', 'app.js', 'styles.css', 'server.mjs']) await access(file)
console.log('Build check passed: static app entry points are present.')
