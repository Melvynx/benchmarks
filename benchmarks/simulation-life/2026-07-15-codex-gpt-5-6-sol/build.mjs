import { access, mkdir, copyFile } from 'node:fs/promises'

const required = ['index.html', 'src/app.js', 'src/simulation.js', 'src/styles.css', 'server.mjs']
for (const file of required) await access(file)
await mkdir('dist/src', { recursive: true })
for (const file of ['index.html', 'server.mjs']) await copyFile(file, `dist/${file}`)
for (const file of ['app.js', 'simulation.js', 'styles.css']) await copyFile(`src/${file}`, `dist/src/${file}`)
console.log('Built self-contained garden in dist/')
