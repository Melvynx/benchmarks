const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps matches of search terms in <mark>. Split with a capture group => odd indexes are matches. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0 || !text) return <>{text}</>;
  const re = new RegExp(`(${terms.map(escapeRe).join('|')})`, 'gi');
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-[#fdd663]/70 px-0.5 text-inherit dark:bg-[#7a5c00] dark:text-[#fff3c4]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
