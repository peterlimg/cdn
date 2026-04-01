import { NextResponse } from "next/server"
import { getGoApiUrl } from "../../../lib/demo/service-endpoints"

export async function GET(request: Request) {
  const url = new URL(`${getGoApiUrl()}/logs`)
  const { searchParams } = new URL(request.url)

  for (const [key, value] of searchParams.entries()) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}
