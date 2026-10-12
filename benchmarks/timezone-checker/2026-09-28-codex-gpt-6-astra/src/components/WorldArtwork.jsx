export default function WorldArtwork() {
  return (
    <div className="world-art" aria-hidden="true">
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <div className="globe">
        <svg viewBox="0 0 200 200">
          <defs><clipPath id="sphere"><circle cx="100" cy="100" r="87" /></clipPath></defs>
          <g clipPath="url(#sphere)">
            <circle cx="100" cy="100" r="87" fill="#e2e9e5" />
            <g fill="none" stroke="#b5c4bc" strokeWidth=".75">
              <ellipse cx="100" cy="100" rx="37" ry="87" /><ellipse cx="100" cy="100" rx="68" ry="87" />
              <path d="M13 100h174M22 62h156M22 138h156M43 32h114M43 168h114M100 13v174" />
            </g>
            <g fill="#809c87" opacity=".85">
              <path d="M32 53l18-16 23-5 8 14-6 12 12 7-4 17-16 2-9 14-12-8-3-13-13-7zM65 101l18 2 13 16-5 20-13 22-8-9-3-22-9-15zM106 43l18-9 17 5 4 11 23 10 9 19-14 4-15-8-10 10-15-4-8 10-12-8-7-15 10-9zM112 90l21 2 14 18-10 27-13 8-9-15-8-20zM151 138l18-5 13 15-10 10-20-3z" />
            </g>
          </g>
        </svg>
        <span className="map-dot dot-one" /><span className="map-dot dot-two" /><span className="map-dot dot-three" />
        <svg className="connection" viewBox="0 0 200 200">
          <path d="M54 78 Q103 18 122 75 Q155 81 156 122" fill="none" stroke="#e18050" strokeWidth="1.4" strokeDasharray="3 4" />
        </svg>
      </div>
      <span className="art-label label-sf">SF <span>☀</span></span>
      <span className="art-label label-bali">BALI <span>☾</span></span>
      <span className="art-star">✳</span>
    </div>
  );
}
