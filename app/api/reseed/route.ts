import { NextResponse } from "next/server"
import {
  DEMO_RESET_TOKEN,
  GO_API_URL,
  INTERNAL_API_TOKEN,
} from "../../../lib/demo/service-endpoints"

type ReseedBody = {
  hostname?: string
  mode?: "ready" | "pending"
}

const defaultHostnames = {
  ready: "ready-demo.northstarcdn.test",
  pending: "pending-demo.northstarcdn.test",
} as const

export async function POST(request: Request) {
  if (!DEMO_RESET_TOKEN || !INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "reseed is not configured" }, { status: 503 })
  }

  if (request.headers.get("x-reset-token") !== DEMO_RESET_TOKEN) {
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

  const response = await fetch(`${GO_API_URL}/domains`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hostname, mode }),
    cache: "no-store",
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
