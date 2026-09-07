import type { TextProps } from "./types";

export interface TextLine {
  text: string;
  width: number;
}

export function fontCss(t: Pick<TextProps, "fontFamily" | "fontWeight" | "fontSize">): string {
  return `${t.fontWeight} ${t.fontSize}px "${t.fontFamily}", system-ui, sans-serif`;
}

export function wrapLines(
  text: string,
  maxWidth: number,
  letterSpacing: number,
  measure: (s: string) => number,
): TextLine[] {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: TextLine[] = [];
  const widthOf = (s: string) => {
    if (s.length === 0) return 0;
    return measure(s) + letterSpacing * Math.max(0, s.length - 1);
  };

  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push({ text: "", width: 0 });
      continue;
    }
    const words = para.split(/(\s+)/);
    let current = "";
    for (const word of words) {
      const next = current + word;
      if (current && widthOf(next) > maxWidth) {
        lines.push({ text: current, width: widthOf(current) });
        current = word.trimStart();
      } else {
        current = next;
      }
    }
    if (current.length > 0 || words.length === 0) {
      lines.push({ text: current, width: widthOf(current) });
    }
  }
  return lines;
}

export function lineOffsetX(align: TextProps["align"], lineWidth: number, boxWidth: number): number {
  if (align === "center") return (boxWidth - lineWidth) / 2;
  if (align === "right") return boxWidth - lineWidth;
  return 0;
}

export function textHeight(lines: number, fontSize: number, lineHeight: number): number {
  return Math.max(fontSize, lines * fontSize * lineHeight);
}
