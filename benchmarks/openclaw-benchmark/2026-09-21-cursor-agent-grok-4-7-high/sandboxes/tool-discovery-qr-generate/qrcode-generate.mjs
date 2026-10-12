

import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");

const QRCode = require("qrcode");
await QRCode.toFile("qrcode.png", "https://example.com");
