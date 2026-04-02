import { getState, setState } from "../../../lib/demo/demo-store"
import type { PolicyRevision } from "../../shared/src/types"

function nextRevisionId(revisions: PolicyRevision[]) {
  return `rev-${revisions.length + 1}`
}

export function publishCachePolicy(domainId: string, cacheEnabled: boolean) {
  let revision: PolicyRevision | null = null

  setState((state) => ({
    ...state,
    domains: state.domains.map((domain) => {
      if (domain.id !== domainId) {
        return domain
      }

      revision = {
        id: nextRevisionId(domain.revisions),
        cacheEnabled,
        label: cacheEnabled ? "Edge cache enabled for the configured request path" : "Baseline - origin fetch only",
        createdAt: new Date().toISOString(),
      }

      return {
        ...domain,
        activeRevisionId: revision.id,
        appliedRevisionId: revision.id,
        revisions: [...domain.revisions, revision],
      }
    }),
  }))

  return revision
}

export function rollbackCachePolicy(domainId: string) {
  let targetRevision: PolicyRevision | null = null

  setState((state) => ({
    ...state,
    cacheEntries: Object.fromEntries(
      Object.entries(state.cacheEntries).filter(([key]) => !key.startsWith(`${domainId}:`)),
    ),
    domains: state.domains.map((domain) => {
      if (domain.id !== domainId) {
        return domain
      }

      targetRevision = domain.revisions.find((revision) => !revision.cacheEnabled) ?? domain.revisions[0]

      return {
        ...domain,
        activeRevisionId: targetRevision.id,
        appliedRevisionId: targetRevision.id,
      }
    }),
  }))

  return targetRevision
}
