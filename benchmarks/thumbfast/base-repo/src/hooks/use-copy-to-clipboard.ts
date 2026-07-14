import { useCallback, useState } from "react";

const copyToClipboardSafe = (text: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime check for older browsers
  if (!navigator.clipboard) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.append(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
    } catch {
      // Failed to copy
    }

    textArea.remove();
    return;
  }
  void navigator.clipboard.writeText(text);
};

export const useCopyToClipboard = (delay = 5000) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    (text: string) => {
      copyToClipboardSafe(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, delay);
    },
    [delay],
  );

  return { isCopied, copyToClipboard };
};
