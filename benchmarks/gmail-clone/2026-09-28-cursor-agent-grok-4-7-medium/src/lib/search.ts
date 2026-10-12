import { isCategory } from "./format";
import type { Category } from "../types";

export interface ParsedQuery {
  text: string[];
  from?: string;
  to?: string;
  subject?: string;
  in?: string;
  label?: string;
  category?: Category;
  is: string[];
  has: string[];
}

export function parseQuery(input: string): ParsedQuery {
  const parsed: ParsedQuery = { text: [], is: [], has: [] };
  const re = /(\b(?:from|to|subject|in|label|category|is|has)):(?:"([^"]*)"|(\S+))|"([^"]+)"|(\S+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    const key = match[1]?.toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? match[5] ?? "").trim();
    if (!value) continue;
    if (!key) {
      parsed.text.push(value);
      continue;
    }
    if (key === "is") parsed.is.push(value.toLowerCase());
    else if (key === "has") parsed.has.push(value.toLowerCase());
    else if (key === "from") parsed.from = value;
    else if (key === "to") parsed.to = value;
    else if (key === "subject") parsed.subject = value;
    else if (key === "in") parsed.in = value.toLowerCase();
    else if (key === "label") parsed.label = value;
    else if (key === "category" && isCategory(value.toLowerCase())) parsed.category = value.toLowerCase() as Category;
  }
  return parsed;
}
