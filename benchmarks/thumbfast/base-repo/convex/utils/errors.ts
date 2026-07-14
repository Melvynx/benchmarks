export function throwValidationError(message = "Invalid request"): never {
  throw new Error(message);
}

export function throwUnauthorized(message = "Unauthorized"): never {
  throw new Error(message);
}

export function throwNotFound(message = "Not found"): never {
  throw new Error(message);
}
