

import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");

const sharp = require("sharp");
await sharp("logo.svg", { density: 512 }).resize(512, 512).png().toFile("logo.png");
