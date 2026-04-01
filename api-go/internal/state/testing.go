package state

func (s *Store) SetAnalyticsGuardedFallbackForTest() {
	s.analyticsFreshness = "degraded"
	s.analyticsFailure = analyticsFailureIngest
}
