import { NextResponse } from "next/server"
import { getDemoResetToken, getGoApiUrl } from "../../../lib/demo/service-endpoints"

type ReseedBody = {
  hostname?: string
  mode?: "ready" | "pending"
  projectName?: string
  origin?: string
  healthCheckPath?: string
  setupPath?: "existing-origin" | "network-static" | "demo-static"
}

const defaultHostnames = {
  ready: "ready-site.northstarcdn.test",
  pending: "pending-site.northstarcdn.test",
} as const

export async function POST(request: Request) {
  const demoResetToken = getDemoResetToken()
  const goApiUrl = getGoApiUrl()
  const requireToken = request.headers.get("x-reset-token") !== null
  if (requireToken && !demoResetToken) {
    return NextResponse.json({ error: "reseed is not configured" }, { status: 503 })
  }

  if (requireToken && request.headers.get("x-reset-token") !== demoResetToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: ReseedBody = {}
  try {
    body = (await request.json()) as ReseedBody
  } catch {
    body = {}
  }

  const mode = body.mode === "pending" ? "pending" : "ready"
  const hostname = body.hostname?.trim() || defaultHostnames[mode]

  const response = await fetch(`${goApiUrl}/domains`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hostname,
      mode,
      projectName: body.projectName,
      origin: body.origin,
      healthCheckPath: body.healthCheckPath,
      setupPath: body.setupPath,
    }),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
