package domains

import "fmt"

func ParseDomainSequence(id string) int {
	var next int
	_, _ = fmt.Sscanf(id, "zone-%d", &next)
	return next
}
