import { Benchmark, BenchmarkFixture } from "../../src/types.js";
import { fileExists, fileContains, fileIsValidHtml } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "multi-step-image-gallery",
  name: "Image Gallery",
  category: "multi-step",
  difficulty: "easy",
  prompt:
    "Create a responsive HTML image gallery page from all images in the ./photos/ directory. The gallery should display thumbnails in a grid with the filename as caption. Save as gallery.html",
  fixtures: [
    {
      filename: "photos/sunset.jpg",
      content: "PLACEHOLDER",
    },
    {
      filename: "photos/mountain.png",
      content: "PLACEHOLDER",
    },
    {
      filename: "photos/beach.jpg",
      content: "PLACEHOLDER",
    },
    {
      filename: "photos/forest.png",
      content: "PLACEHOLDER",
    },
    {
      filename: "photos/city.jpg",
      content: "PLACEHOLDER",
    },
  ] as BenchmarkFixture[],
  validate: async (ctx) => {
    const exists = await fileExists(ctx.sandboxDir, "gallery.html");

    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "gallery.html file not found",
      };
    }

    const isValidHtml = await fileIsValidHtml(ctx.sandboxDir, "gallery.html");

    if (!isValidHtml) {
      return {
        passed: false,
        score: "1",
        reason: "gallery.html is not valid HTML",
        details: { fileExists: true },
      };
    }

    const imageNames = ["sunset", "mountain", "beach", "forest", "city"];
    let foundImages = 0;

    for (const name of imageNames) {
      const found = await fileContains(ctx.sandboxDir, "gallery.html", name);
      if (found) foundImages++;
    }

    if (foundImages < 5) {
      return {
        passed: false,
        score: "1",
        reason: `gallery.html missing references to some image files (found ${foundImages}/5)`,
        details: { fileExists: true, isValidHtml: true, foundImages },
      };
    }

    const hasResponsiveCSS = await fileContains(ctx.sandboxDir, "gallery.html", "grid")
      .then(async (found) => {
        if (found) return true;
        return await fileContains(ctx.sandboxDir, "gallery.html", "flex");
      });

    if (!hasResponsiveCSS) {
      return {
        passed: true,
        score: "2",
        reason: "gallery.html created with all images but basic layout",
        details: {
          fileExists: true,
          isValidHtml: true,
          allImagesReferenced: true,
        },
      };
    }

    return {
      passed: true,
      score: "3",
      reason: "Successfully created responsive HTML gallery with proper CSS grid/flex",
      details: {
        fileExists: true,
        isValidHtml: true,
        allImagesReferenced: true,
        hasResponsiveCSS: true,
      },
    };
  },
};
