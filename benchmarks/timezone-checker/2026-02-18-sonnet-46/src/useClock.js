import { useState, useEffect } from "react";

export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

export function formatTime(date, timezone, format) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: format === "12h",
  }).format(date);
}

export function getLocalHour(date, timezone) {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(date),
    10
  ) % 24;
}

export function getUTCOffsetString(timezone, date = new Date()) {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const diff = (tzDate - utcDate) / (1000 * 60 * 60);
  const sign = diff >= 0 ? "+" : "-";
  const abs = Math.abs(diff);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
