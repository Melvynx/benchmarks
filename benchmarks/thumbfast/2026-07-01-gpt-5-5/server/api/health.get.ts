export default function health() {
  return Response.json({
    ok: true,
    service: "thumbfast-web",
  });
}
