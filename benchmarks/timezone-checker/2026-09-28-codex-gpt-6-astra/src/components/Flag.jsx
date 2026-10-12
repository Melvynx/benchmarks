export default function Flag({ code }) {
  return <span className="flag" aria-hidden="true">{[...code].map(character => String.fromCodePoint(character.charCodeAt(0) + 127397)).join('')}</span>;
}
