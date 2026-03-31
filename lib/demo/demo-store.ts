import type { DemoState } from "../../services/shared/src/types"

const LIMIT_BYTES = 150_000

function createInitialState(): DemoState {
  return {
    domains: [],
    activeDomainId: null,
    events: [],
    cacheEntries: {},
    quotaLimitBytes: LIMIT_BYTES,
    quotaUsedBytes: 0,
    requestCounter: 0,
  }
}

const globalStore = globalThis as typeof globalThis & { __cdnDemoState?: DemoState }

if (!globalStore.__cdnDemoState) {
  globalStore.__cdnDemoState = createInitialState()
}

export function getState() {
  return globalStore.__cdnDemoState as DemoState
}

export function setState(updater: (state: DemoState) => DemoState) {
  globalStore.__cdnDemoState = updater(getState())
}

export function resetDemoState() {
  globalStore.__cdnDemoState = createInitialState()
}
