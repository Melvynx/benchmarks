import { useMemo, useState } from "react";
import type { NodeId, SceneNode } from "../engine/types";
import { useEditorState } from "./context";

export function LayersPanel() {
  const { editor } = useEditorState("structure");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"layers" | "assets">("layers");
  const page = editor.page();
  const roots = page.nodes[page.rootId]?.childIds ?? [];
  return (
    <aside className="panel left">
      <div className="panel-tabs">
        <button type="button" className={tab === "layers" ? "on" : ""} onClick={() => setTab("layers")}>Layers</button>
        <button type="button" className={tab === "assets" ? "on" : ""} onClick={() => setTab("assets")}>Assets</button>
      </div>
      {tab === "layers" ? (
        <>
          <input className="search" placeholder="Find layers" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="layer-scroll">
            {roots.length === 0 && <p className="empty">Layers you add will show up here.</p>}
            {roots.slice().reverse().map((id) => (
              <LayerRow key={id} id={id} depth={0} query={query.trim().toLowerCase()} />
            ))}
          </div>
          <div className="pages">
            {editor.doc.pages.map((item) => (
              <button key={item.id} type="button" className={item.id === page.id ? "on" : ""} onClick={() => editor.switchPage(item.id)}>
                {item.name}
              </button>
            ))}
            <button type="button" onClick={() => editor.addPage()} title="Add page">+</button>
          </div>
        </>
      ) : (
        <Assets />
      )}
    </aside>
  );
}

function LayerRow({ id, depth, query }: { id: NodeId; depth: number; query: string }) {
  const { editor } = useEditorState("structure");
  const node = editor.node(id);
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  if (!node || node.type === "canvas") return null;
  const name = node.name.toLowerCase();
  const childMatch = node.childIds.some((child) => matches(editor.page().nodes, child, query));
  if (query && !name.includes(query) && !childMatch) return null;
  const selected = editor.selection.includes(id);
  return (
    <div>
      <div
        className={selected ? "layer on" : "layer"}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onDragStart={(event) => event.dataTransfer.setData("text/node-id", id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const dragged = event.dataTransfer.getData("text/node-id");
          if (!dragged || dragged === id) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientY - rect.top) / rect.height;
          if (ratio > 0.25 && ratio < 0.75 && (node.type === "frame" || node.type === "group" || node.type === "instance")) {
            editor.reparentNode(dragged, id, node.childIds.length);
          } else {
            const parentId = node.parentId ?? editor.page().rootId;
            const parent = editor.node(parentId);
            const index = parent ? parent.childIds.indexOf(id) + (ratio > 0.5 ? 1 : 0) : 0;
            editor.reparentNode(dragged, parentId, index);
          }
        }}
        onClick={(event) => {
          if (event.shiftKey) editor.setSelection(editor.selection.includes(id) ? editor.selection.filter((item) => item !== id) : [...editor.selection, id]);
          else editor.setSelection([id]);
        }}
        onDoubleClick={() => setRenaming(true)}
      >
        {node.childIds.length > 0 ? (
          <button type="button" className="twisty" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>{open ? "▾" : "▸"}</button>
        ) : <span className="twisty" />}
        {renaming ? (
          <input
            autoFocus
            className="rename"
            defaultValue={node.name}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => { editor.rename(id, event.target.value); setRenaming(false); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
              if (event.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <span className="layer-name">{node.name}</span>
        )}
        <button type="button" className={node.visible ? "eye" : "eye off"} title={node.visible ? "Hide" : "Show"} onClick={(event) => { event.stopPropagation(); editor.toggleVisible(id); }}>◉</button>
        <button type="button" className={node.locked ? "eye" : "eye off"} title={node.locked ? "Unlock" : "Lock"} onClick={(event) => { event.stopPropagation(); editor.toggleLock(id); }}>{node.locked ? "▣" : "▢"}</button>
      </div>
      {open && node.childIds.slice().reverse().map((child) => <LayerRow key={child} id={child} depth={depth + 1} query={query} />)}
    </div>
  );
}

function matches(nodes: Record<string, SceneNode>, id: string, query: string): boolean {
  const node = nodes[id];
  if (!node) return false;
  if (node.name.toLowerCase().includes(query)) return true;
  return node.childIds.some((child) => matches(nodes, child, query));
}

function Assets() {
  const { editor } = useEditorState("structure");
  const colors = editor.doc.colorStyles;
  const texts = editor.doc.textStyles;
  const summary = useMemo(() => `${colors.length} colors · ${texts.length} text styles`, [colors.length, texts.length]);
  return (
    <div className="assets">
      <p className="empty">{summary}</p>
      <button type="button" onClick={() => editor.createColorStyle()}>New color from selection</button>
      {colors.map((style) => (
        <button key={style.id} type="button" className="style-row" onClick={() => editor.applyColorStyle(style.id)}>
          <i style={{ background: `rgb(${style.color.r}, ${style.color.g}, ${style.color.b})` }} />
          {style.name}
        </button>
      ))}
      <button type="button" onClick={() => editor.createTextStyle()}>New text style from selection</button>
      {texts.map((style) => (
        <button key={style.id} type="button" className="style-row" onClick={() => editor.applyTextStyle(style.id)}>
          {style.name}
          <small>{style.fontSize}</small>
        </button>
      ))}
    </div>
  );
}
