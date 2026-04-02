import { NextResponse } from "next/server"

const demoCss = [
  ":root {",
  "  --unseen-bg: #08111f;",
  "  --unseen-panel: #10203b;",
  "  --unseen-accent: #5cc8ff;",
  "}",
  ".demo-shell {",
  "  background: linear-gradient(180deg, var(--unseen-bg), var(--unseen-panel));",
  "  color: white;",
  "  padding: 24px;",
  "}",
  ".demo-shell .metric {",
  "  border: 1px solid rgba(92, 200, 255, 0.24);",
  "  border-radius: 12px;",
  "  padding: 12px 16px;",
  "}",
].join("\n") + "\n" + ".demo-cache-line { color: var(--unseen-accent); }\n".repeat(800)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params

  if (asset !== "demo.css") {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return new NextResponse(demoCss, {
    status: 200,
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(Buffer.byteLength(demoCss, "utf8")),
      ETag: `demo-css-${Buffer.byteLength(demoCss, "utf8")}`,
    },
  })
}
