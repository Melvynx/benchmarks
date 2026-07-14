import {
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkCategory,
  CategoryResult,
} from "./types.js";

interface ModelComparison {
  ranking: Array<{ model: string; agencyIndex: number; totalScore: number }>;
  byCategory: Record<
    BenchmarkCategory,
    Array<{ model: string; avgScore: number; passed: number }>
  >;
}

export function calculateSuiteResults(
  results: BenchmarkResult[],
  model: string
): BenchmarkSuite {
  const byCategory: Record<BenchmarkCategory, CategoryResult> = {
    "tool-discovery": {
      passed: 0,
      total: 0,
      avgScore: 0,
      benchmarks: [],
    },
    "api-workarounds": {
      passed: 0,
      total: 0,
      avgScore: 0,
      benchmarks: [],
    },
    "data-processing": {
      passed: 0,
      total: 0,
      avgScore: 0,
      benchmarks: [],
    },
    "system-ops": {
      passed: 0,
      total: 0,
      avgScore: 0,
      benchmarks: [],
    },
    creative: {
      passed: 0,
      total: 0,
      avgScore: 0,
      benchmarks: [],
    },
    "multi-step": {
      passed: 0,
      total: 0,
      avgScore: 0,
      benchmarks: [],
    },
  };

  for (const result of results) {
    const category = byCategory[result.category];
    category.total += 1;
    if (result.passed) {
      category.passed += 1;
    }
    category.benchmarks.push(result);
  }

  let totalScore = 0;

  for (const category of Object.values(byCategory)) {
    if (category.total > 0) {
      const scores = category.benchmarks.map((b) => parseInt(b.score));
      category.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      totalScore += scores.reduce((a, b) => a + b, 0);
    }
  }

  const maxScore = results.length * 3;
  const agencyIndex = maxScore > 0 ? totalScore / maxScore : 0;

  return {
    results,
    model,
    totalScore,
    maxScore,
    agencyIndex,
    byCategory,
    timestamp: new Date().toISOString(),
  };
}

export function compareModels(suites: BenchmarkSuite[]): ModelComparison {
  const ranking = suites
    .map((suite) => ({
      model: suite.model,
      agencyIndex: suite.agencyIndex,
      totalScore: suite.totalScore,
    }))
    .sort((a, b) => b.agencyIndex - a.agencyIndex);

  const categories: BenchmarkCategory[] = [
    "tool-discovery",
    "api-workarounds",
    "data-processing",
    "system-ops",
    "creative",
    "multi-step",
  ];

  const byCategory: Record<
    BenchmarkCategory,
    Array<{ model: string; avgScore: number; passed: number }>
  > = {} as Record<
    BenchmarkCategory,
    Array<{ model: string; avgScore: number; passed: number }>
  >;

  for (const category of categories) {
    byCategory[category] = suites
      .map((suite) => ({
        model: suite.model,
        avgScore: suite.byCategory[category].avgScore,
        passed: suite.byCategory[category].passed,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }

  return {
    ranking,
    byCategory,
  };
}
