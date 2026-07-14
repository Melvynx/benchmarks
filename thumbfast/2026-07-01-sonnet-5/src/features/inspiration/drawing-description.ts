// Kept as a plain string literal (not imported from src/features/drawing/drawing.types)
// because this file is pulled into the Convex Node action bundle via a relative import,
// which cannot resolve the "@/" alias used by the drawing editor feature module.
// Keep this literal in sync with PLACEHOLDER_PERSON_KIND in
// src/features/drawing/drawing.types.ts.
const PLACEHOLDER_PERSON_KIND = "placeholder-person";

type FabricSceneObject = {
  type?: string;
  text?: string;
  data?: { kind?: string; name?: string };
  objects?: FabricSceneObject[];
};

type FabricScene = {
  objects?: FabricSceneObject[];
};

function flattenObjects(
  objects: FabricSceneObject[] | undefined,
): FabricSceneObject[] {
  if (!objects) return [];
  return objects.flatMap((object) => [
    object,
    ...flattenObjects(object.objects),
  ]);
}

function getSceneObjects(scene: unknown): FabricSceneObject[] {
  return flattenObjects((scene as FabricScene | undefined)?.objects);
}

export function sceneHasPlaceholderPerson(scene: unknown): boolean {
  return getSceneObjects(scene).some(
    (object) => object.data?.kind === PLACEHOLDER_PERSON_KIND,
  );
}

function extractSceneText(scene: unknown): string[] {
  return getSceneObjects(scene)
    .map((object) => object.text?.trim())
    .filter((text): text is string => Boolean(text));
}

const DRAWING_TEMPLATE_FRAMING =
  "This is a hand-drawn composition/layout template, not a real photo. It defines the intended subject placement, text blocks, and graphic elements for a YouTube thumbnail — use it purely as a layout guide.";

export function buildDrawingDescription(params: {
  scene: unknown;
  templateName?: string;
}): string {
  const parts = [DRAWING_TEMPLATE_FRAMING];

  if (params.templateName) {
    parts.push(`Based on the "${params.templateName}" template.`);
  }

  const texts = extractSceneText(params.scene);
  if (texts.length > 0) {
    parts.push(
      `Layout text guidance (preserve this wording and its approximate placement unless the user's prompt requests different text): ${texts
        .map((text) => `"${text}"`)
        .join(", ")}.`,
    );
  }

  if (sceneHasPlaceholderPerson(params.scene)) {
    parts.push(
      "The template includes placeholder character silhouette(s) marking where a subject belongs — treat these as composition stand-ins, not literal content to reproduce.",
    );
  }

  return parts.join("\n\n");
}
