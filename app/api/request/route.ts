import { NextResponse } from "next/server"
import { getEdgeNodeUrl } from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  const body = (await request.json()) as { domainId?: string; path?: string; targetNodeId?: string }
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()

  if (!body.domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 })
  }

  const response = await fetch(`${getEdgeNodeUrl(body.targetNodeId)}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const text = await response.text()
  let payload: unknown = { error: text || "request through edge failed" }

  try {
    payload = text ? JSON.parse(text) : payload
  } catch {
    payload = { error: text || `request through edge failed with ${response.status}` }
  }

  return NextResponse.json(payload, { status: response.status })
}
