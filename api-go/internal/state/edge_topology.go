package state

func defaultEdgeTopology() []EdgeNode {
	return []EdgeNode{
		{
			ID:               "edge-us-east",
			Label:            "US East",
			Region:           "us-east",
			VerificationPath: "/edge-nodes/edge-us-east",
		},
		{
			ID:               "edge-eu-west",
			Label:            "EU West",
			Region:           "eu-west",
			VerificationPath: "/edge-nodes/edge-eu-west",
		},
		{
			ID:               "edge-ap-south",
			Label:            "AP South",
			Region:           "ap-south",
			VerificationPath: "/edge-nodes/edge-ap-south",
		},
	}
}

func copyEdgeTopology(nodes []EdgeNode) []EdgeNode {
	if len(nodes) == 0 {
		return nil
	}
	copyNodes := make([]EdgeNode, len(nodes))
	copy(copyNodes, nodes)
	return copyNodes
}
