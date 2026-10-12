import type { Person } from "../types";
import { colorFor, highlightParts, initials } from "../logic";

export function Avatar({ person, size = 40 }: { person: Pick<Person, "name" | "email">; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: colorFor(person.email), fontSize: size < 28 ? 11 : 14 }}
      aria-hidden="true"
    >
      {initials(person.name || person.email)}
    </span>
  );
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = highlightParts(text, query);
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>,
      )}
    </>
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="plain">
      {lines.map((line, index) => (
        <span key={index}>
          {linkify(line)}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </div>
  );
}

function linkify(line: string) {
  const parts = line.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noreferrer noopener">
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}
