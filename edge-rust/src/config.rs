use std::env;

#[derive(Clone)]
pub struct RuntimeConfig {
    pub go_api_url: String,
    pub internal_api_token: Option<String>,
    pub node_id: String,
    pub node_label: String,
    pub node_region: String,
}

pub fn load_runtime_config() -> RuntimeConfig {
    RuntimeConfig {
        go_api_url: env::var("GO_API_URL").unwrap_or_else(|_| "http://127.0.0.1:4001".to_string()),
        internal_api_token: env::var("INTERNAL_API_TOKEN")
            .ok()
            .filter(|value| !value.is_empty()),
        node_id: env::var("EDGE_NODE_ID").unwrap_or_else(|_| "edge-us-east".to_string()),
        node_label: env::var("EDGE_NODE_LABEL").unwrap_or_else(|_| "US East".to_string()),
        node_region: env::var("EDGE_NODE_REGION").unwrap_or_else(|_| "us-east".to_string()),
    }
}
