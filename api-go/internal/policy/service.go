package policy

import "fmt"

func RevisionID(revisionCount int) string {
	return fmt.Sprintf("rev-%d", revisionCount)
}

func RevisionLabel(cacheEnabled bool) string {
	return map[bool]string{true: "Edge cache enabled for the configured request path", false: "Baseline - live origin fetch only"}[cacheEnabled]
}
