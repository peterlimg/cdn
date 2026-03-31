import { getState, setState } from "../../../lib/demo/demo-store"

export function readCache(domainId: string, path: string, revisionId: string) {
  const cacheKey = `${domainId}:${path}`
  const entry = getState().cacheEntries[cacheKey]

  if (!entry || entry.revisionId !== revisionId) {
    return null
  }

  return entry
}

export function writeCache(domainId: string, path: string, revisionId: string, bytesServed: number) {
  const cacheKey = `${domainId}:${path}`

  setState((state) => ({
    ...state,
    cacheEntries: {
      ...state.cacheEntries,
      [cacheKey]: {
        bytesServed,
        revisionId,
      },
    },
  }))
}
