import chalk from "chalk";
import { BenchmarkSuite, BenchmarkResult, AgencyScoreLabels, BenchmarkCategory } from "./types.js";
import { promises as fs } from "fs";

export interface ModelComparison {
  models: Array<{
    model: string;
    agencyIndex: number;
    totalScore: number;
    maxScore: number;
    results: BenchmarkResult[];
  }>;
  timestamp: string;
}

export function printBenchmarkResult(result: BenchmarkResult, verbose?: boolean): void {
  const statusLabel = result.passed ? chalk.green("PASS") : chalk.red("FAIL");
  const scoreColor = result.score === "3" ? chalk.cyan : result.score === "0" ? chalk.red : chalk.yellow;
  const scoreLabel = scoreColor(`${result.score}/3`);
  const categoryLabel = chalk.gray(`(${result.category})`);

  let line = `${statusLabel} ${scoreLabel} ${result.benchmarkName} ${categoryLabel} - ${result.reason}`;

  if (verbose) {
    line += ` [${result.duration}ms]`;
  }

  console.log(line);
}

export function printSuiteReport(suite: BenchmarkSuite): void {
  console.log(chalk.bold("\n=== Benchmark Suite Report ===\n"));
  console.log(chalk.blue(`Model: ${suite.model}`));
  console.log(chalk.blue(`Timestamp: ${suite.timestamp}`));

  console.log(chalk.bold("\n--- Results by Category ---\n"));

  const categories = Object.entries(suite.byCategory);
  let maxCategoryLength = 0;
  categories.forEach(([cat]) => {
    if (cat.length > maxCategoryLength) maxCategoryLength = cat.length;
  });

  categories.forEach(([category, result]) => {
    const percentage = ((result.avgScore / 3) * 100).toFixed(1);
    const passStatus = `${result.passed}/${result.total}`;
    const categoryPad = category.padEnd(maxCategoryLength);
    console.log(
      `  ${categoryPad}  ${passStatus.padEnd(8)}  avg: ${result.avgScore.toFixed(2)}/3 (${percentage}%)`
    );
  });

  console.log(chalk.bold("\n--- Overall Score ---\n"));
  const agencyPercentage = (suite.agencyIndex * 100).toFixed(1);
  console.log(`  Total Score: ${chalk.cyan(suite.totalScore.toString())} / ${suite.maxScore}`);
  console.log(`  Agency Index: ${chalk.cyan(agencyPercentage + "%")}`);

  const activeCategories = categories.filter(([, cat]) => cat.total > 0);
  if (activeCategories.length === 0) return;

  const bestCategory = activeCategories.reduce((best, [name, cat]) =>
    cat.avgScore > best[1].avgScore ? [name, cat] : best
  );
  const worstCategory = activeCategories.reduce((worst, [name, cat]) =>
    cat.avgScore < worst[1].avgScore ? [name, cat] : worst
  );

  console.log(chalk.bold("\n--- Highlights ---\n"));
  console.log(chalk.green(`  Best: ${bestCategory[0]} (${bestCategory[1].avgScore.toFixed(2)}/3)`));
  console.log(chalk.yellow(`  Worst: ${worstCategory[0]} (${worstCategory[1].avgScore.toFixed(2)}/3)`));
  console.log();
}

export function printComparisonReport(comparison: ModelComparison): void {
  console.log(chalk.bold("\n=== Model Comparison Report ===\n"));
  console.log(chalk.blue(`Timestamp: ${comparison.timestamp}`));

  const sorted = [...comparison.models].sort((a, b) => b.agencyIndex - a.agencyIndex);

  console.log(chalk.bold("\n--- Rankings ---\n"));
  sorted.forEach((model, idx) => {
    const rank = idx + 1;
    const agencyPercentage = (model.agencyIndex * 100).toFixed(1);
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
    console.log(
      `  #${rank} ${medal} ${chalk.cyan(model.model.padEnd(20))} ${agencyPercentage}% (${model.totalScore}/${model.maxScore})`
    );
  });

  console.log(chalk.bold("\n--- Per-Category Breakdown ---\n"));

  const categories: Set<BenchmarkCategory> = new Set();
  sorted.forEach((model) => {
    const categoryMap = new Map<BenchmarkCategory, { passed: number; total: number; avgScore: number }>();
    model.results.forEach((result) => {
      categories.add(result.category);
      const existing = categoryMap.get(result.category) || { passed: 0, total: 0, avgScore: 0 };
      categoryMap.set(result.category, {
        passed: existing.passed + (result.passed ? 1 : 0),
        total: existing.total + 1,
        avgScore: existing.avgScore + parseFloat(result.score),
      });
    });

    Array.from(categories).forEach((cat) => {
      const catData = categoryMap.get(cat);
      if (catData) {
        const avg = (catData.avgScore / catData.total).toFixed(2);
        const percentage = ((parseFloat(avg) / 3) * 100).toFixed(0);
        console.log(
          `  ${model.model.padEnd(15)} ${cat.padEnd(18)} ${catData.passed}/${catData.total} passed (avg: ${avg}/3, ${percentage}%)`
        );
      }
    });
    console.log();
  });
}

export async function exportResultsJson(suite: BenchmarkSuite, filepath: string): Promise<void> {
  const json = JSON.stringify(suite, null, 2);
  await fs.writeFile(filepath, json, "utf-8");
}
