import { z } from "zod";

export const BenchmarkCategory = z.enum([
  "tool-discovery",
  "api-workarounds",
  "data-processing",
  "system-ops",
  "creative",
  "multi-step",
]);
export type BenchmarkCategory = z.infer<typeof BenchmarkCategory>;

export const AgencyScore = z.enum(["0", "1", "2", "3"]);
export type AgencyScore = z.infer<typeof AgencyScore>;

export const AgencyScoreLabels: Record<AgencyScore, string> = {
  "0": "Gave up / said impossible",
  "1": "Tried but wrong result",
  "2": "Solved with straightforward approach",
  "3": "Solved with creative/optimal approach",
};

export const Difficulty = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export interface ValidationContext {
  sandboxDir: string;
  outputFiles: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  commandsRun: string[];
  packagesInstalled: string[];
}

export interface ValidationResult {
  passed: boolean;
  score: AgencyScore;
  reason: string;
  details?: Record<string, unknown>;
}

export interface Benchmark {
  id: string;
  name: string;
  category: BenchmarkCategory;
  difficulty: Difficulty;
  prompt: string;
  hints?: string[];
  fixtures?: BenchmarkFixture[];
  validate: (ctx: ValidationContext) => Promise<ValidationResult>;
  timeout?: number;
}

export interface BenchmarkFixture {
  filename: string;
  content: string | Buffer;
  encoding?: BufferEncoding;
}

export interface BenchmarkResult {
  benchmarkId: string;
  benchmarkName: string;
  category: BenchmarkCategory;
  difficulty: Difficulty;
  model: string;
  passed: boolean;
  score: AgencyScore;
  reason: string;
  duration: number;
  commandsRun: string[];
  packagesInstalled: string[];
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface BenchmarkSuite {
  results: BenchmarkResult[];
  model: string;
  totalScore: number;
  maxScore: number;
  agencyIndex: number;
  byCategory: Record<BenchmarkCategory, CategoryResult>;
  timestamp: string;
}

export interface CategoryResult {
  passed: number;
  total: number;
  avgScore: number;
  benchmarks: BenchmarkResult[];
}

export interface RunOptions {
  model: string;
  categories?: BenchmarkCategory[];
  ids?: string[];
  timeout?: number;
  verbose?: boolean;
  sandboxBase?: string;
}
