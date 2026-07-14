import "./SettingsPanel.css";

export function SettingsPanel({ settings, onUpdate, onClose }) {
  const { timeFormat, workStart, workEnd, wakeStart, wakeEnd } = settings;

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>Time Format</h3>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${timeFormat === "12h" ? "active" : ""}`}
                onClick={() => onUpdate({ timeFormat: "12h" })}
              >
                12h <span className="toggle-example">3:45 PM</span>
              </button>
              <button
                className={`toggle-btn ${timeFormat === "24h" ? "active" : ""}`}
                onClick={() => onUpdate({ timeFormat: "24h" })}
              >
                24h <span className="toggle-example">15:45</span>
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3>Working Hours <span className="settings-badge green">Green overlap band</span></h3>
            <div className="range-row">
              <div className="range-field">
                <label>Start</label>
                <select
                  value={workStart}
                  onChange={(e) => onUpdate({ workStart: Number(e.target.value) })}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <span className="range-sep">→</span>
              <div className="range-field">
                <label>End</label>
                <select
                  value={workEnd}
                  onChange={(e) => onUpdate({ workEnd: Number(e.target.value) })}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3>Wake-up Window <span className="settings-badge gray">Gray band</span></h3>
            <div className="range-row">
              <div className="range-field">
                <label>Start</label>
                <select
                  value={wakeStart}
                  onChange={(e) => onUpdate({ wakeStart: Number(e.target.value) })}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <span className="range-sep">→</span>
              <div className="range-field">
                <label>End</label>
                <select
                  value={wakeEnd}
                  onChange={(e) => onUpdate({ wakeEnd: Number(e.target.value) })}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
