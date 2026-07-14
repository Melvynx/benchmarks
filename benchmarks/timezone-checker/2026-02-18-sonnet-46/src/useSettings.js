import { useState, useEffect } from "react";

const DEFAULT_SETTINGS = {
  timeFormat: "12h",
  workStart: 9,
  workEnd: 18,
  wakeStart: 7,
  wakeEnd: 9,
};

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("tz-settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem("tz-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
}
