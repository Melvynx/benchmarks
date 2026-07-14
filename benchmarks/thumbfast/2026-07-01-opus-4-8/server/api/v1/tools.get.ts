export default function listTools() {
  return Response.json(
    {
      success: false,
      error: "The public tools API is not available.",
      code: "API_NOT_AVAILABLE",
      tools: [],
      totalCount: 0,
    },
    { status: 410 },
  );
}
