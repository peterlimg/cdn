import { NextResponse } from "next/server"
import { GO_API_URL } from "../../../lib/demo/service-endpoints"

export async function POST() {
  const response = await fetch(`${GO_API_URL}/reset`, {
    method: "POST",
    cache: "no-store",
  })
  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
