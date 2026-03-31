import { NextResponse } from "next/server"
import {
  DEMO_RESET_TOKEN,
  GO_API_URL,
  INTERNAL_API_TOKEN,
  RUST_EDGE_URL,
} from "../../../lib/demo/service-endpoints"

export async function POST(request: Request) {
  if (!DEMO_RESET_TOKEN || !INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "reset is not configured" }, { status: 503 })
  }

  if (request.headers.get("x-reset-token") !== DEMO_RESET_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const controlReset = await fetch(`${GO_API_URL}/reset`, {
    method: "POST",
    headers: {
      "X-Internal-Token": INTERNAL_API_TOKEN,
    },
    cache: "no-store",
  })
  const edgeReset = await fetch(`${RUST_EDGE_URL}/reset`, {
    method: "POST",
    headers: {
      "X-Internal-Token": INTERNAL_API_TOKEN,
    },
    cache: "no-store",
  })

  if (!controlReset.ok || !edgeReset.ok) {
    return NextResponse.json({ error: "reset failed" }, { status: 500 })
  }

  const payload = await controlReset.json()
  return NextResponse.json(payload, { status: controlReset.status })
}
