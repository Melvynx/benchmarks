import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@/features/editor/editor.store";
import { getMentionSuggestionItems } from "@/features/editor/prompt-editor";

describe("prompt mention suggestions", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("finds uploaded gallery images that are not selected yet", async () => {
    useEditorStore.getState().setAvailableUserImages([
      {
        id: "img-next-logo",
        imageUrl: "https://example.com/next-logo.png",
        name: "NextJS logo",
        description: "Uploaded image",
      },
    ]);

    const suggestions = await getMentionSuggestionItems("next");

    expect(suggestions).toEqual([
      expect.objectContaining({
        id: "img-next-logo",
        label: "NextJS logo",
        type: "image",
        imageUrl: "https://example.com/next-logo.png",
        subtitle: "Uploaded image",
      }),
    ]);
  });

  it("searches uploaded image descriptions too", async () => {
    useEditorStore.getState().setAvailableUserImages([
      {
        id: "img-react-mark",
        imageUrl: "https://example.com/react-mark.png",
        name: "Logo",
        description: "React framework mark",
      },
    ]);

    const suggestions = await getMentionSuggestionItems("framework");

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      id: "img-react-mark",
      label: "Logo",
      type: "image",
    });
  });

  it("keeps selected images visible as already added results", async () => {
    useEditorStore.getState().setUserImages([
      {
        id: "img-next-logo",
        imageUrl: "https://example.com/next-logo.png",
        name: "NextJS logo",
        description: "Uploaded image",
      },
    ]);

    const suggestions = await getMentionSuggestionItems("next");

    expect(suggestions).toEqual([
      expect.objectContaining({
        id: "img-next-logo",
        isAdded: true,
        type: "image",
      }),
    ]);
  });

  it("orders matching suggestions as images, persons, then inspirations", async () => {
    useEditorStore.getState().setAvailableUserImages([
      {
        id: "img-claude-logo",
        imageUrl: "https://example.com/claude-logo.png",
        name: "Claude logo",
        description: "Extra image",
      },
    ]);
    useEditorStore.getState().setPersons([
      {
        id: "person-claude",
        orgId: "org-1",
        name: "Claude host",
        description: "Person reference",
        images: ["https://example.com/person.png"],
      },
    ]);
    useEditorStore.getState().setPersonIds(["person-claude"]);
    useEditorStore.getState().setInspirations([
      {
        id: "inspiration-claude",
        name: "Claude style",
        aiDescription: "Inspiration reference",
        category: null,
        thumbnailUrls: ["https://example.com/inspiration.png"],
        createdAt: "2026-05-28T00:00:00.000Z",
        adminReview: "APPROVED",
        isPublic: true,
        orgId: "org-1",
        hasDrawing: false,
        hasPlaceholder: false,
        anonymizedSubject: false,
        anonymizedText: false,
        anonymizedLogos: false,
        anonymizedTextDescription: null,
        youtubeUrl: null,
        sourceVideoTitle: null,
        sourceVideoAuthor: null,
        sourceVideoThumbnailUrl: null,
      },
    ]);

    const suggestions = await getMentionSuggestionItems("claude");

    expect(suggestions.map((suggestion) => suggestion.type)).toEqual([
      "image",
      "person",
      "inspiration",
    ]);
    expect(suggestions[1]).toMatchObject({
      type: "person",
      isAdded: true,
    });
  });
});
