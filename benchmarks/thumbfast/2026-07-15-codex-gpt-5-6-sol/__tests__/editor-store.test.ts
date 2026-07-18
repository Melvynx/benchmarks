import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@/features/editor/editor.store";

describe("editor.store model normalization", () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorStore.getState().reset();
  });

  it("normalizes legacy GPT model ids during initialization and persists the canonical id", () => {
    useEditorStore.getState().initialize({
      model: "gpt-image-1.5" as never,
    });

    expect(useEditorStore.getState().model).toBe("gpt-image-2");
    expect(localStorage.getItem("thumbfast-selected-model")).toBe(
      "gpt-image-2",
    );
  });

  it("falls back to the default model for unknown saved ids", () => {
    localStorage.setItem("thumbfast-selected-model", "totally-unknown-model");

    useEditorStore.getState().initialize({});

    expect(useEditorStore.getState().model).toBe("gemini-3.1-flash");
    expect(localStorage.getItem("thumbfast-selected-model")).toBe(
      "gemini-3.1-flash",
    );
  });
});
