export function getPathParam(request: Request, index: number) {
  const path = new URL(request.url).pathname;
  return path.split("/").filter(Boolean)[index];
}

