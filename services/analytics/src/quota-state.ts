import { getUsageState } from "../../control-api/src/server"

export function getQuotaState() {
  const usage = getUsageState()

  return {
    ...usage,
    remainingBytes: Math.max(usage.limitBytes - usage.usedBytes, 0),
    percentUsed: Math.min((usage.usedBytes / usage.limitBytes) * 100, 100),
  }
}
