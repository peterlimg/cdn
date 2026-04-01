import { NextResponse } from "next/server"
import { getRustEdgeUrl } from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  const rustEdgeUrl = getRustEdgeUrl()
  const body = (await request.json()) as { domainId?: string; path?: string }
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()

  if (!body.domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 })
  }

  const response = await fetch(`${rustEdgeUrl}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
