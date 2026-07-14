import { useEffect, useRef } from "react";
import { DRAWING_HEIGHT, DRAWING_WIDTH } from "../drawing.types";
import { renderDrawingDocument } from "../drawing.render";
import type { DrawingEditorApi } from "../use-drawing-editor";

type DrawingCanvasProps = {
  editor: DrawingEditorApi;
};

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = DRAWING_WIDTH / rect.width;
  const scaleY = DRAWING_HEIGHT / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function DrawingCanvas({ editor }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    document,
    selectedIds,
    previewElement,
    editingTextId,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    updateTextContent,
    finishTextEditing,
    selectedElement,
  } = editor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderDrawingDocument(ctx, document, {
      selectedIds: editingTextId ? [] : selectedIds,
      previewElement,
      showSelection: !editingTextId,
    });
  }, [document, editingTextId, previewElement, selectedIds]);

  const editingText =
    editingTextId && selectedElement?.type === "text" && selectedElement.id === editingTextId
      ? selectedElement
      : document.elements.find(
          (element) => element.id === editingTextId && element.type === "text",
        );

  return (
    <div className="bg-muted/40 relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
      <div
        className="border-border relative w-full max-w-6xl overflow-hidden rounded-xl border bg-[#f8f7f4] shadow-sm"
        style={{ aspectRatio: "16 / 9" }}
      >
        <canvas
          ref={canvasRef}
          width={DRAWING_WIDTH}
          height={DRAWING_HEIGHT}
          className="absolute inset-0 size-full touch-none"
          onPointerDown={(event) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.setPointerCapture(event.pointerId);
            onPointerDown(getCanvasPoint(canvas, event.clientX, event.clientY), {
              shiftKey: event.shiftKey,
              detail: event.detail,
            });
          }}
          onPointerMove={(event) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            onPointerMove(getCanvasPoint(canvas, event.clientX, event.clientY), {
              shiftKey: event.shiftKey,
            });
          }}
          onPointerUp={() => onPointerUp()}
          onPointerCancel={() => onPointerUp()}
        />

        {editingText && editingText.type === "text" ? (
          <textarea
            data-drawing-text-editor="true"
            autoFocus
            value={editingText.text}
            onChange={(event) =>
              updateTextContent(editingText.id, event.target.value)
            }
            onBlur={() => finishTextEditing()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                finishTextEditing();
              }
            }}
            className="absolute z-10 resize-none border-2 border-[#1971c2] bg-white/95 p-1 outline-none"
            style={{
              left: `${(editingText.x / DRAWING_WIDTH) * 100}%`,
              top: `${(editingText.y / DRAWING_HEIGHT) * 100}%`,
              width: `${(editingText.width / DRAWING_WIDTH) * 100}%`,
              minHeight: `${(editingText.height / DRAWING_HEIGHT) * 100}%`,
              color: editingText.strokeColor,
              fontSize: `clamp(12px, ${(editingText.fontSize / DRAWING_WIDTH) * 100}cqw, ${editingText.fontSize}px)`,
              fontWeight: editingText.fontWeight,
              lineHeight: 1.2,
              fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
