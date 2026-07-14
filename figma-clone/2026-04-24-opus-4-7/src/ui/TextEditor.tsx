import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { nodeWorldMatrix, isText } from '../core/scene';
import { matApply } from '../core/geometry/Mat2D';
import { updateNodes } from '../state/actions';

/**
 * Renders a contenteditable textarea overlay aligned with the editing text node.
 * Writes text back to the scene node on input.
 */
export const TextEditor = (): JSX.Element | null => {
  const state = useStore((s) => s);
  const editingId = state.transient.editingTextId;
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editingId) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editingId]);

  if (!editingId) return null;
  const node = state.doc.nodes[editingId];
  if (!node || !isText(node)) return null;

  const m = nodeWorldMatrix(state.doc, editingId);
  // Get top-left in world space
  const tl = matApply(m, { x: 0, y: 0 });

  // Convert world → screen CSS pixels (relative to canvas; wrapper is absolute)
  const v = state.viewport;
  const screenX = (tl.x - v.x) * v.zoom;
  const screenY = (tl.y - v.y) * v.zoom;

  const style: React.CSSProperties = {
    left: screenX,
    top: screenY,
    width: node.width * v.zoom,
    minWidth: 2,
    height: node.height * v.zoom,
    transform: `rotate(${node.rotation}rad)`,
    transformOrigin: `${(node.width / 2) * v.zoom}px ${(node.height / 2) * v.zoom}px`,
    fontFamily: `"${node.fontFamily}"`,
    fontWeight: node.fontWeight,
    fontSize: node.fontSize * v.zoom,
    lineHeight: node.lineHeight,
    letterSpacing: `${node.letterSpacing * v.zoom}px`,
    textAlign: node.textAlign === 'justify' ? 'left' : node.textAlign,
    fontStyle: node.italic ? 'italic' : 'normal',
    color: node.color,
    opacity: node.opacity,
    border: 'none',
    padding: 0,
    margin: 0,
    resize: 'none',
    overflow: 'hidden',
    whiteSpace: 'pre',
    background: 'transparent',
  };

  return (
    <textarea
      ref={ref}
      className="canvas-text-editor"
      style={style}
      value={node.text}
      spellCheck={false}
      onChange={(e) => {
        const newText = e.target.value;
        updateNodes(
          [editingId],
          (n) => {
            if (n.type === 'text') n.text = newText;
          },
          'Edit text',
        );
      }}
      onBlur={() => {
        useStore.setState((s) => ({ transient: { ...s.transient, editingTextId: null } }));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.currentTarget.blur();
          e.preventDefault();
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.currentTarget.blur();
          e.preventDefault();
        }
        e.stopPropagation();
      }}
    />
  );
};
