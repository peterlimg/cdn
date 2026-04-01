import { NextResponse } from "next/server"
import {
  getDemoResetToken,
  getGoApiUrl,
  getInternalApiToken,
  getRustEdgeUrl,
} from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  const demoResetToken = getDemoResetToken()
  const goApiUrl = getGoApiUrl()
  const internalApiToken = getInternalApiToken()
  const rustEdgeUrl = getRustEdgeUrl()

  if (!demoResetToken || !internalApiToken) {
    return NextResponse.json({ error: "reset is not configured" }, { status: 503 })
  }

  if (request.headers.get("x-reset-token") !== demoResetToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const controlReset = await fetch(`${goApiUrl}/reset`, {
    method: "POST",
    headers: {
      "X-Internal-Token": internalApiToken,
    },
    cache: "no-store",
  })
  const edgeReset = await fetch(`${rustEdgeUrl}/reset`, {
    method: "POST",
    headers: {
      "X-Internal-Token": internalApiToken,
    },
    cache: "no-store",
  })

  if (!controlReset.ok || !edgeReset.ok) {
    return NextResponse.json({ error: "reset failed" }, { status: 500 })
  }

  const payload = await controlReset.json()
  return NextResponse.json(payload, { status: controlReset.status })
}
