import { getState, setState } from "../../../lib/demo/demo-store"

export function getUsageState() {
  const state = getState()

  return {
    usedBytes: state.quotaUsedBytes,
    limitBytes: state.quotaLimitBytes,
    reached: state.quotaUsedBytes >= state.quotaLimitBytes,
  }
}

export function incrementUsage(bytesServed: number) {
  setState((state) => ({
    ...state,
    quotaUsedBytes: state.quotaUsedBytes + bytesServed,
  }))

  return getUsageState()
}

export function resetUsage() {
  setState((state) => ({ ...state, quotaUsedBytes: 0 }))
}
