import type { CardTheme, VideoData } from "./card.types";

type VideoCardProps = {
  videoData: VideoData;
  theme: CardTheme;
  scale?: number;
};

function createScale(theme: CardTheme, baseFactor: number) {
  function scale(value: number) {
    return value * baseFactor;
  }

  return {
    raw: scale,
    width: scale(450),
    fontSize: (factor: number) => scale(16 * factor) * theme.card.fontSize,
    lineHeight: (factor: number) =>
      scale(16 * factor) * theme.card.fontSize * 1.2,
    text: (factor: number) => ({
      fontSize: scale(16 * factor) * theme.card.fontSize,
      lineHeight: `${scale(16 * factor) * theme.card.fontSize * 1.2}px`,
      fontWeight: 500 as const,
    }),
    padding: (factor: number) => scale(4 * factor) * theme.card.spacing,
    borderRadius: (factor: number) =>
      scale(6 * factor) * theme.card.borderRadius,
  };
}

function fadeColor(hex: string, amount: number): string {
  const h =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  if (!h.startsWith("#") || h.length < 7) return hex;
  const r = Number.parseInt(h.slice(1, 3), 16);
  const g = Number.parseInt(h.slice(3, 5), 16);
  const b = Number.parseInt(h.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r},${g},${b},${1 - amount})`;
}

function getInitialColor(name: string): string {
  const colors = [
    "#ff4444",
    "#4444ff",
    "#44aa44",
    "#ff8800",
    "#aa44aa",
    "#44aaaa",
    "#ff44aa",
    "#aaaa44",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function VideoCard({
  videoData,
  theme,
  scale: baseFactor = 1,
}: VideoCardProps) {
  const s = createScale(theme, baseFactor);
  const fadedFg = fadeColor(theme.card.foreground, 0.4);
  const initial = videoData.channelTitle.charAt(0).toUpperCase();
  const avatarColor = getInitialColor(videoData.channelTitle);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.card.background,
        padding: s.padding(7.5),
        borderRadius: s.borderRadius(2) + s.padding(7.5),
        width: s.width,
        fontFamily: "'Inter', 'Roboto', sans-serif",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          display: "flex",
          marginBottom: s.fontSize(0.6),
          borderRadius: s.borderRadius(2),
          overflow: "hidden",
          position: "relative",
        }}
      >
        {}
        <img
          src={videoData.thumbnailUrl}
          alt=""
          style={{ width: "100%", display: "block" }}
        />

        {theme.options.showDuration && videoData.duration ? (
          <div
            style={{
              position: "absolute",
              bottom: s.raw(8),
              right: s.raw(8),
              color: theme.duration.foreground,
              backgroundColor: theme.duration.background,
              borderRadius: Math.max(0, s.borderRadius(2) - s.raw(8)),
              padding: s.fontSize(0.2),
              ...s.text(0.75),
            }}
          >
            {videoData.duration}
          </div>
        ) : null}

        {theme.options.progressBar !== null ? (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              height: s.raw(4),
              width: "100%",
              display: "flex",
              backgroundColor: theme.progressBar.background,
            }}
          >
            <div
              style={{
                width: `${theme.options.progressBar}%`,
                backgroundColor: theme.progressBar.foreground,
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div style={{ display: "flex", gap: s.fontSize(0.6) }}>
        {theme.options.showChannelThumbnail ? (
          videoData.channelAvatarUrl ? (
            <img
              src={videoData.channelAvatarUrl}
              alt=""
              style={{
                borderRadius: "100%",
                width: s.fontSize(2.6),
                height: s.fontSize(2.6),
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: s.fontSize(2.6),
                height: s.fontSize(2.6),
                minWidth: s.fontSize(2.6),
                borderRadius: "100%",
                backgroundColor: avatarColor,
                color: "#ffffff",
                fontSize: s.fontSize(1),
                fontWeight: 600,
              }}
            >
              {initial}
            </div>
          )
        ) : null}

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              color: theme.card.foreground,
              marginBottom: s.fontSize(0.35),
              ...s.text(1),
            }}
          >
            {videoData.title}
          </div>

          {theme.options.showChannelTitle ? (
            <div
              style={{
                display: "flex",
                color: fadedFg,
                ...s.text(0.875),
                fontWeight: 400,
              }}
            >
              {videoData.channelTitle}
            </div>
          ) : null}

          {theme.options.showViews || theme.options.showPublishedAt ? (
            <div
              style={{
                color: fadedFg,
                ...s.text(0.875),
                fontWeight: 400,
                marginTop: s.fontSize(0.2),
              }}
            >
              {[
                theme.options.showViews && videoData.views,
                theme.options.showPublishedAt && videoData.publishedAt,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
