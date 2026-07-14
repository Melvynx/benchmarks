export default function orgCommandUnavailable() {
  return Response.json(
    {
      success: false,
      error: "The organization command API is not available.",
      code: "API_NOT_AVAILABLE",
    },
    { status: 410 },
  );
}
