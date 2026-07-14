const normalizePromiseError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  if (error && typeof error === "object") {
    const errorObject = error as {
      message?: unknown;
      statusText?: unknown;
      code?: unknown;
    };
    const message =
      typeof errorObject.message === "string"
        ? errorObject.message
        : typeof errorObject.statusText === "string"
          ? errorObject.statusText
          : typeof errorObject.code === "string"
            ? errorObject.code
            : null;

    if (message) {
      return new Error(message);
    }
  }

  return new Error("Request failed");
};

/**
 * Safely executes a promise and returns a type-safe result object.
 *
 * @param promise - The promise to execute
 * @returns An object containing either the result or the error
 */
export async function safePromise<T>(promise: Promise<T>): Promise<{
  data: T | null;
  error: Error | null;
}> {
  try {
    const result = await promise;
    return {
      data: result,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizePromiseError(error),
    };
  }
}

/**
 * Unwraps a result object from safePromise and either returns the result or throws the error.
 *
 * @param promise - The result object from safePromise
 * @returns The result value if no error occurred
 * @throws The error if one occurred
 */
export async function unwrapSafePromise<T, E = Error>(
  promise: Promise<{
    data: T | null;
    error: E;
  }>,
): Promise<T> {
  const { error, data } = await promise;
  if (error) {
    throw normalizePromiseError(error);
  }

  if (data === null) {
    throw new Error("Data is null but no error was provided");
  }

  return data;
}
