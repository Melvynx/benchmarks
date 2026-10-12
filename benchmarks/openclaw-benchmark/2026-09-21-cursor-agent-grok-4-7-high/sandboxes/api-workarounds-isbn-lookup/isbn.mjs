
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("openlibrary.json", "utf8"));
const doc = (data.docs || [])[0] || {};
const author = Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "");
writeFileSync("book-info.json", JSON.stringify({
  title: doc.title,
  author,
  publication_year: doc.first_publish_year,
  isbn: "978-0-13-468599-1",
}, null, 2));
