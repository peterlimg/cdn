import { getGoApiUrl } from "./service-endpoints"
import type {
  DashboardSnapshot,
  DomainRecord,
  ServiceLog,
} from "../../services/shared/src/types"

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Service request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchDashboardSnapshot(domainId?: string): Promise<DashboardSnapshot> {
  const url = new URL(`${getGoApiUrl()}/dashboard`)
  if (domainId) {
    url.searchParams.set("domainId", domainId)
  }

  const response = await fetch(url, { cache: "no-store" })
  return parseJson<DashboardSnapshot>(response)
}

export async function fetchDomains(): Promise<DomainRecord[]> {
  const response = await fetch(`${getGoApiUrl()}/domains`, { cache: "no-store" })
  return parseJson<DomainRecord[]>(response)
}

export async function fetchDomain(domainId: string): Promise<DomainRecord | null> {
  const response = await fetch(`${getGoApiUrl()}/domains/${domainId}`, { cache: "no-store" })

  if (response.status === 404) {
    return null
  }

  return parseJson<DomainRecord>(response)
}

export async function createDomain(input: {
  hostname: string
  mode: "ready" | "pending"
  projectName?: string
  origin?: string
  healthCheckPath?: string
  setupPath?: "existing-origin" | "network-static" | "demo-static"
}) {
  const response = await fetch(`${getGoApiUrl()}/domains`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  })

  return parseJson<DomainRecord>(response)
}

export async function updateDomainSetup(
  domainId: string,
  input: {
    projectName?: string
    origin: string
    healthCheckPath?: string
    setupPath: "existing-origin" | "network-static" | "demo-static"
  },
) {
  const response = await fetch(`${getGoApiUrl()}/domains/${domainId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  })

  return parseJson<DomainRecord>(response)
}

export async function verifyDomainDns(domainId: string) {
  const response = await fetch(`${getGoApiUrl()}/domains/${domainId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify-dns" }),
    cache: "no-store",
  })

  return parseJson<DomainRecord>(response)
}

export async function fetchLogs(domainId: string, service: "edge" | "api", requestId?: string) {
  const url = new URL(`${getGoApiUrl()}/logs`)
  url.searchParams.set("domainId", domainId)
  url.searchParams.set("service", service)
  if (requestId) {
    url.searchParams.set("requestId", requestId)
  }

  const response = await fetch(url, { cache: "no-store" })
  return parseJson<ServiceLog[]>(response)
}
