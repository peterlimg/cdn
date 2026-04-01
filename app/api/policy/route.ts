import { NextResponse } from "next/server"
import { getGoApiUrl } from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  const goApiUrl = getGoApiUrl()
  const body = (await request.json()) as { domainId?: string; cacheEnabled?: boolean }

  if (!body.domainId || typeof body.cacheEnabled !== "boolean") {
    return NextResponse.json({ error: "domainId and cacheEnabled are required" }, { status: 400 })
  }

  const response = await fetch(`${goApiUrl}/policy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}

export async function DELETE(request: Request) {
  const goApiUrl = getGoApiUrl()
  const body = (await request.json()) as { domainId?: string }

  if (!body.domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 })
  }

  const response = await fetch(`${goApiUrl}/policy`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
