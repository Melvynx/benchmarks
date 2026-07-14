/* eslint-disable no-await-in-loop */
import { logger } from "@/lib/logger";

type RetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  onError?: (error: unknown, attempt: number) => void;
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const backoff = options.backoff ?? false;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      options.onError?.(error, attempt);

      if (attempt === maxAttempts) {
        logger.error("Max retry attempts reached", {
          error,
          maxAttempts,
        });
        throw error;
      }

      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      logger.debug(
        `Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
