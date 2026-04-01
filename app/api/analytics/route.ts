import { NextResponse } from "next/server"
import { getGoApiUrl } from "../../../lib/demo/service-endpoints"

export async function GET(request: Request) {
  const goApiUrl = getGoApiUrl()
  const { searchParams } = new URL(request.url)
  const url = new URL(`${goApiUrl}/analytics`)
  const domainId = searchParams.get("domainId")
  if (domainId) {
    url.searchParams.set("domainId", domainId)
  }

  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
