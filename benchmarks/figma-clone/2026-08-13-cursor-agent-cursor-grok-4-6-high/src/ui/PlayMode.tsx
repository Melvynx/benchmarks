import { worldAABB } from "../core/scene";
import { patchUi, viewDocument } from "../core/store";
import { useEditor } from "./use-editor";

export function PlayMode() {
  const open = useEditor((s) => s.ui.playMode);
  const doc = useEditor((s) => s.document);
  const startId = useEditor((s) => s.ui.playFrameId);
  if (!open) return null;
  const frames = Object.values(doc.nodes).filter((n) => n.type === "frame");
  const current = (startId && doc.nodes[startId]) || frames[0];
  if (!current) {
    return (
      <div className="play-root">
        <button className="play-close" onClick={() => patchUi({ playMode: false })}>Exit</button>
        <div className="empty">No frames to play.</div>
      </div>
    );
  }
  const b = worldAABB(viewDocument(), current.id);
  const links = doc.prototypeLinks.filter((l) => l.fromId === current.id || ancestorHas(current.id, l.fromId));
  return (
    <div className="play-root">
      <button className="play-close" onClick={() => patchUi({ playMode: false, playFrameId: null })}>Exit play</button>
      <div
        className="play-frame"
        style={{ width: Math.min(390, current.width), height: Math.min(844, current.height), background: "#fff" }}
      >
        <PlayCanvas nodeId={current.id} />
        {links.map((l) => (
          <button
            key={l.id}
            className="btn primary"
            style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}
            onClick={() => patchUi({ playFrameId: l.toId })}
          >
            Next
          </button>
        ))}
      </div>
      <span style={{ display: "none" }}>{b.minX}</span>
    </div>
  );
}

function ancestorHas(frameId: string, fromId: string): boolean {
  const doc = viewDocument();
  let cur = doc.nodes[fromId];
  while (cur) {
    if (cur.id === frameId) return true;
    if (!cur.parentId) break;
    cur = doc.nodes[cur.parentId];
  }
  return false;
}

function PlayCanvas({ nodeId }: { nodeId: string }) {
  const doc = viewDocument();
  const node = doc.nodes[nodeId];
  if (!node) return null;
  return (
    <div style={{ width: node.width, height: node.height, transform: `scale(${Math.min(1, 390 / node.width)})`, transformOrigin: "top left" }}>
      <div style={{ padding: 24, fontFamily: "Inter, system-ui" }}>
        <strong>{node.name}</strong>
        <p>Click Next to follow prototype links.</p>
      </div>
    </div>
  );
}
