export default function getTool() {
  return Response.json(
    {
      success: false,
      error: "The public tools API is not available.",
      code: "API_NOT_AVAILABLE",
    },
    { status: 410 },
  );
}
