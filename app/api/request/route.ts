import { NextResponse } from "next/server"
import { RUST_EDGE_URL } from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  const body = (await request.json()) as { domainId?: string; path?: string }

  if (!body.domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 })
  }

  const response = await fetch(`${RUST_EDGE_URL}/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
