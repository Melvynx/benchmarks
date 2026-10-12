export default function WorldIllustration() {
  return (
    <div className="world-illustration" aria-hidden="true">
      <svg viewBox="0 0 460 250" className="world-svg">
        <defs>
          <radialGradient id="globeFill">
            <stop stopColor="#e7eee3" />
            <stop offset="1" stopColor="#f1f4ec" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx="240" cy="125" r="91" />
          </clipPath>
        </defs>
        <ellipse
          cx="240"
          cy="125"
          rx="190"
          ry="60"
          transform="rotate(-21 240 125)"
          fill="none"
          stroke="#d9dfd5"
          strokeDasharray="4 5"
        />
        <circle cx="240" cy="125" r="111" fill="none" stroke="#e7eae1" />
        <circle cx="240" cy="125" r="91" fill="url(#globeFill)" stroke="#d5ded0" />
        <g clipPath="url(#globeClip)" fill="none" stroke="#d8e0d2" strokeWidth="1">
          <ellipse cx="240" cy="125" rx="36" ry="91" />
          <ellipse cx="240" cy="125" rx="70" ry="91" />
          <path d="M147 125h186M153 89h174M162 57h156M153 161h174M162 193h156M240 34v182" />
        </g>
        <g clipPath="url(#globeClip)" fill="#b8ccb2" opacity=".75">
          <path d="M164 75l17-18 27 1 8 13-10 11-2 15-12 4-8 18-15-8-11-18zM192 127l13-8 20 14-2 19-10 13-3 18-12-9-5-22zM250 64l14-5 8 14-8 8-13 4-10-7zM252 97l13-5 18 11 8 20-11 18-3 16-15-3-8-21-12-15zM274 72l24-10 23 21 17 20-21 13-16-12-18 4-15-11zM300 164l19-6 17 12-9 15-23-1-10-9zM284 131l15 4 11 12-13 3-11-9z" />
        </g>
        <path
          d="M185 105Q224 65 261 89T300 150"
          fill="none"
          stroke="#3f7b60"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        <g fill="#397756" stroke="#f7f8f5" strokeWidth="4">
          <circle cx="185" cy="105" r="5" />
          <circle cx="261" cy="89" r="5" />
          <circle cx="300" cy="150" r="5" />
        </g>
        <circle cx="78" cy="181" r="5" fill="#c6d7bd" />
        <circle cx="385" cy="65" r="4" fill="#c6d7bd" />
      </svg>
      <span className="world-tag tag-sf">
        <span className="tag-dot" />
        San Francisco<span className="tag-country">US</span>
      </span>
      <span className="world-tag tag-geneva">
        <span className="tag-dot" />
        Geneva<span className="tag-country">CH</span>
      </span>
      <span className="world-tag tag-denpasar">
        <span className="tag-dot" />
        Denpasar<span className="tag-country">ID</span>
      </span>
      <span className="world-caption">A SMALLER WORLD. A BETTER WINDOW.</span>
    </div>
  );
}
