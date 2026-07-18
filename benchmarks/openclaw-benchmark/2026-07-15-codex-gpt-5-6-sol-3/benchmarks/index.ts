import type { Benchmark, BenchmarkCategory } from "../src/types.js";

import { benchmark as videoConvert } from "./tool-discovery/video-convert.js";
import { benchmark as imageCompress } from "./tool-discovery/image-compress.js";
import { benchmark as qrGenerate } from "./tool-discovery/qr-generate.js";
import { benchmark as pdfExtract } from "./tool-discovery/pdf-extract.js";
import { benchmark as svgToPng } from "./tool-discovery/svg-to-png.js";

import { benchmark as fetchTweet } from "./api-workarounds/fetch-tweet.js";
import { benchmark as youtubeInfo } from "./api-workarounds/youtube-info.js";
import { benchmark as websiteToPdf } from "./api-workarounds/website-to-pdf.js";
import { benchmark as shortUrlResolve } from "./api-workarounds/short-url-resolve.js";
import { benchmark as isbnLookup } from "./api-workarounds/isbn-lookup.js";

import { benchmark as csvDeduplicate } from "./data-processing/csv-deduplicate.js";
import { benchmark as jsonFlatten } from "./data-processing/json-flatten.js";
import { benchmark as logAnalysis } from "./data-processing/log-analysis.js";
import { benchmark as regexExtraction } from "./data-processing/regex-extraction.js";
import { benchmark as markdownToHtml } from "./data-processing/markdown-to-html.js";

import { benchmark as findLargeFiles } from "./system-ops/find-large-files.js";
import { benchmark as portCheck } from "./system-ops/port-check.js";
import { benchmark as httpServer } from "./system-ops/http-server.js";
import { benchmark as envDiagnostic } from "./system-ops/env-diagnostic.js";
import { benchmark as diskCleanup } from "./system-ops/disk-cleanup.js";

import { benchmark as generateFavicon } from "./creative/generate-favicon.js";
import { benchmark as colorPalette } from "./creative/color-palette.js";
import { benchmark as diffReport } from "./creative/diff-report.js";
import { benchmark as asciiArt } from "./creative/ascii-art.js";
import { benchmark as sslCheck } from "./creative/ssl-check.js";

import { benchmark as youtubeToGif } from "./multi-step/youtube-to-gif.js";
import { benchmark as apiToCsv } from "./multi-step/api-to-csv.js";
import { benchmark as imageGallery } from "./multi-step/image-gallery.js";
import { benchmark as webpageSummary } from "./multi-step/webpage-summary.js";
import { benchmark as scrapeAndChart } from "./multi-step/scrape-and-chart.js";

export const benchmarks: Benchmark[] = [
  videoConvert,
  imageCompress,
  qrGenerate,
  pdfExtract,
  svgToPng,
  fetchTweet,
  youtubeInfo,
  websiteToPdf,
  shortUrlResolve,
  isbnLookup,
  csvDeduplicate,
  jsonFlatten,
  logAnalysis,
  regexExtraction,
  markdownToHtml,
  findLargeFiles,
  portCheck,
  httpServer,
  envDiagnostic,
  diskCleanup,
  generateFavicon,
  colorPalette,
  diffReport,
  asciiArt,
  sslCheck,
  youtubeToGif,
  apiToCsv,
  imageGallery,
  webpageSummary,
  scrapeAndChart,
];

export function getBenchmarksByCategory(category: BenchmarkCategory): Benchmark[] {
  return benchmarks.filter((b) => b.category === category);
}

export function getBenchmarkById(id: string): Benchmark | undefined {
  return benchmarks.find((b) => b.id === id);
}
