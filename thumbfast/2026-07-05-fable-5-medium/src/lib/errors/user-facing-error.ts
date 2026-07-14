const INTERNAL_ERROR_PATTERNS = [
  "internal server error",
  "failed to fetch",
  "networkerror",
  "load failed",
  "server error",
];

function cleanConvexErrorMessage(message: string) {
  return message
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .replace(/\nCalled by client[\s\S]*$/i, "")
    .replace(/\nStack:[\s\S]*$/i, "")
    .trim();
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again in a moment.",
) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const message = cleanConvexErrorMessage(rawMessage);
  if (!message) return fallback;

  const lowerMessage = message.toLowerCase();
  if (
    INTERNAL_ERROR_PATTERNS.some((pattern) => lowerMessage.includes(pattern))
  ) {
    return fallback;
  }

  return message;
}

export function getDiagnosticErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: undefined,
  };
}
