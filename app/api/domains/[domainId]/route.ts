import { NextResponse } from "next/server"
import { GO_API_URL } from "../../../../lib/demo/service-endpoints"

type RouteContext = {
  params: Promise<{ domainId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { domainId } = await context.params
  const body = (await request.json()) as {
    projectName?: string
    origin?: string
    setupPath?: "existing-origin" | "network-static" | "demo-static"
  }

  if (!body.origin || !body.setupPath) {
    return NextResponse.json({ error: "origin and setupPath are required" }, { status: 400 })
  }

  const response = await fetch(`${GO_API_URL}/domains/${domainId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}

export async function POST(request: Request, context: RouteContext) {
  const { domainId } = await context.params
  const body = (await request.json()) as { action?: string }

  if (body.action !== "verify-dns" && body.action !== "recheck-origin") {
    return NextResponse.json({ error: "valid domain action is required" }, { status: 400 })
  }

  const response = await fetch(`${GO_API_URL}/domains/${domainId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
