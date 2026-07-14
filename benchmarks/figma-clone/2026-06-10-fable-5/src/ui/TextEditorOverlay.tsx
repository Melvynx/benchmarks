import { useEffect, useRef, type JSX } from 'react';
import { mul } from '../geometry/mat2d';
import { patchNode, removeSubtree, getN } from '../scene/draft';
import { worldMatrix } from '../scene/nodeGeometry';
import type { NodeId, TextNode } from '../scene/types';
import { beginGesture, cancelGesture, editDoc, endGesture, updateGesture } from '../store/docEdit';
import { editorStore, useEditor } from '../store/store';
import { effectiveLineHeight } from '../text/textLayout';
import { fontString } from '../text/fonts';
import { rgbaToCss } from '../utils/color';

/**
 * In-place text editing: a transparent textarea transformed with the exact
 * world matrix × viewport of the node, with identical font metrics. The
 * canvas hides the node's glyphs while this is mounted; the layout pass keeps
 * auto-resize working live as you type.
 */
export function TextEditorOverlay(): JSX.Element | null {
  const editingId = useEditor((s) => s.editingTextId);
  if (!editingId) return null;
  return <TextEditor key={editingId} id={editingId} />;
}

function TextEditor({ id }: { id: NodeId }): JSX.Element | null {
  const doc = useEditor((s) => s.doc);
  const viewport = useEditor((s) => s.viewport);
  const node = doc.nodes[id];
  const finished = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    beginGesture('text-edit');
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
    // Safety net for unmounts that bypass finish() (e.g. doc switch). Must NOT
    // mark `finished` — StrictMode runs this cleanup once on mount, and the
    // editor still needs to commit afterwards. A stray endGesture is harmless.
    return () => {
      if (!finished.current) endGesture('Edit text');
    };
  }, []);

  if (!node || node.type !== 'text') return null;
  const text = node as TextNode;

  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    const value = textareaRef.current?.value ?? text.characters;
    if (value.trim() === '') {
      cancelGesture();
      editDoc('Remove empty text', (d) => removeSubtree(d, id), { select: [] });
    } else {
      endGesture('Edit text');
    }
    editorStore.setState({ editingTextId: null });
  };

  const onInput = (value: string): void => {
    updateGesture((d) => {
      const fresh = getN(d, id);
      if (fresh && fresh.type === 'text') patchNode(d, fresh, { characters: value });
    });
  };

  // Screen transform = viewport ∘ world.
  const world = worldMatrix(doc, id);
  const m = mul(
    { a: viewport.zoom, b: 0, c: 0, d: viewport.zoom, e: viewport.panX, f: viewport.panY },
    world,
  );

  const fill = text.fills.find((f) => f.enabled);
  const color = fill && fill.type === 'solid' ? rgbaToCss(fill.color, fill.opacity) : '#fff';
  const lineHeight = effectiveLineHeight(text);

  return (
    <textarea
      ref={textareaRef}
      className="text-editor"
      defaultValue={text.characters}
      spellCheck={false}
      style={{
        transform: `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`,
        width: Math.max(text.width, 8) + 6,
        height: Math.max(text.height, lineHeight) + 4,
        font: fontString(text.fontWeight, text.fontSize, text.fontFamily),
        lineHeight: `${lineHeight}px`,
        letterSpacing: `${text.letterSpacing}px`,
        textAlign: text.textAlign,
        whiteSpace: text.autoResize === 'width' ? 'pre' : 'pre-wrap',
        color,
      }}
      onInput={(e) => onInput((e.target as HTMLTextAreaElement).value)}
      onBlur={finish}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          finish();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}
