import { useCallback, useEffect, type RefObject } from "react";

function supportsFieldSizing() {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("field-sizing", "content")
  );
}

export function useAutosizeTextareaFallback(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: unknown,
) {
  const resizeTextarea = useCallback(() => {
    if (supportsFieldSizing()) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const { maxHeight } = window.getComputedStyle(textarea);
    const maxHeightPx = Number.parseFloat(maxHeight);
    const hasMaxHeight = Number.isFinite(maxHeightPx);

    textarea.style.height = "auto";
    textarea.style.height = `${
      hasMaxHeight
        ? Math.min(textarea.scrollHeight, maxHeightPx)
        : textarea.scrollHeight
    }px`;
  }, [textareaRef]);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  return resizeTextarea;
}
