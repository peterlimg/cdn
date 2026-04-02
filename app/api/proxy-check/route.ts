import { NextResponse } from "next/server"
import { getEdgeNodeUrl } from "../../../lib/demo/service-endpoints"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const domainId = url.searchParams.get("domainId")
  const path = url.searchParams.get("path") ?? "/assets/demo.css"
  const targetNodeId = url.searchParams.get("targetNodeId")

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 })
  }

  const response = await fetch(`${getEdgeNodeUrl(targetNodeId)}/proxy${path}?domainId=${domainId}`, {
    method: "GET",
    headers: {
      "X-Request-Id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
    },
    cache: "no-store",
  })

  const body = await response.arrayBuffer()
  const proxied = new NextResponse(body, { status: response.status })
  const contentType = response.headers.get("content-type")
  if (contentType) {
    proxied.headers.set("content-type", contentType)
  }
  for (const header of ["x-request-id", "x-trace-id", "x-cache-status"]) {
    const value = response.headers.get(header)
    if (value) {
      proxied.headers.set(header, value)
    }
  }
  return proxied
}
