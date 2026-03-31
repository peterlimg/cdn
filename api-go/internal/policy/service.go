package policy

import "fmt"

func RevisionID(revisionCount int) string {
	return fmt.Sprintf("rev-%d", revisionCount)
}

func RevisionLabel(cacheEnabled bool) string {
	return map[bool]string{true: "Edge cache enabled for /assets/demo.css", false: "Baseline - origin fetch only"}[cacheEnabled]
}
