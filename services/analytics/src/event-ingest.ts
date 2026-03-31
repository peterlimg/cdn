import { getState } from "../../../lib/demo/demo-store"

export function listEvents(domainId?: string) {
  const events = getState().events

  if (!domainId) {
    return events
  }

  return events.filter((event) => event.domainId === domainId)
}
