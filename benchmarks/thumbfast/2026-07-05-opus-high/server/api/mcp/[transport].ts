export default function mcpUnavailable() {
  return Response.json(
    {
      error: "The MCP endpoint is not available.",
      code: "MCP_NOT_AVAILABLE",
    },
    { status: 410 },
  );
}
