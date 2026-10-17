import type { Message } from "./types";

export function signatureBlock(sig: string) {
  return `<div class="mail-signature">-- <br>${sig}</div>`;
}

/** Full message HTML as recipients see it: body followed by the signature. */
export function bodyHtml(m: Pick<Message, "html" | "signature">) {
  return m.signature ? `${m.html}${signatureBlock(m.signature)}` : m.html;
}
