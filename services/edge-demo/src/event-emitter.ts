import { setState } from "../../../lib/demo/demo-store"
import type { AnalyticsEvent } from "../../shared/src/types"

export function emitEvent(event: AnalyticsEvent) {
  setState((state) => ({
    ...state,
    events: [event, ...state.events],
  }))
}
