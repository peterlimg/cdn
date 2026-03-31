import { NextResponse } from "next/server"
import { GO_API_URL } from "../../../lib/demo/service-endpoints"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = new URL(`${GO_API_URL}/analytics`)
  const domainId = searchParams.get("domainId")
  if (domainId) {
    url.searchParams.set("domainId", domainId)
  }

  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
