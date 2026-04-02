import { NextResponse } from "next/server"
import {
  getDemoResetToken,
  getEdgeResetUrls,
  getGoApiUrl,
  getInternalApiToken,
} from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  const demoResetToken = getDemoResetToken()
  const goApiUrl = getGoApiUrl()
  const internalApiToken = getInternalApiToken()

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
  const edgeResets = await Promise.all(getEdgeResetUrls().map((url) => fetch(`${url}/reset`, {
    method: "POST",
    headers: {
      "X-Internal-Token": internalApiToken,
    },
    cache: "no-store",
  })))

  if (!controlReset.ok || edgeResets.some((response) => !response.ok)) {
    return NextResponse.json({ error: "reset failed" }, { status: 500 })
  }

  const payload = await controlReset.json()
  return NextResponse.json(payload, { status: controlReset.status })
}
