
import { readdirSync, writeFileSync } from "fs";
const photos = readdirSync("photos").filter((name) => /\.(png|jpe?g|gif|webp)$/i.test(name));
const cards = photos.map((name) => `<figure><img src="photos/${name}" alt="${name}"><figcaption>${name}</figcaption></figure>`).join("\n");
const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gallery</title>
<style>
body { margin: 0; font-family: sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 16px; }
figure { margin: 0; }
img { width: 100%; height: 140px; object-fit: cover; background: #eee; }
figcaption { font-size: 0.9rem; padding-top: 4px; }
</style>
</head>
<body>
<main class="grid">
${cards}
</main>
</body>
</html>
`;
writeFileSync("gallery.html", html);
