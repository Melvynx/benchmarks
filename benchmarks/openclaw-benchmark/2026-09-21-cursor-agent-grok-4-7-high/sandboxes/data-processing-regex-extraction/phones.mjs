
import { readFileSync, writeFileSync } from "fs";
const text = readFileSync("contacts.txt", "utf8");
const matches = text.match(/(\+\d[\d\s().-]{6,}\d|\(\d{3}\)\s*\d{3}-\d{4}|\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2})/g) || [];
const numbers = matches.map((raw) => {
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  let normalized;
  if (hasPlus) normalized = digits;
  else if (digits.length === 10 && digits.startsWith("0")) normalized = "33" + digits.slice(1);
  else if (digits.length === 10) normalized = "1" + digits;
  else normalized = digits;
  return "+" + normalized;
}).filter((value) => /^\+\d{10,15}$/.test(value));
console.log(numbers.join("\n"));
writeFileSync("phones.txt", numbers.join("\n") + "\n");
