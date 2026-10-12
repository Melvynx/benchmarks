
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("yt-dlp.json", "utf8"));
writeFileSync("video-info.json", JSON.stringify({
  title: data.title,
  duration: data.duration,
  view_count: data.view_count,
  channel: data.channel || data.uploader,
  id: data.id,
}, null, 2));
