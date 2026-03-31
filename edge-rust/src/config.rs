use std::env;

#[derive(Clone)]
pub struct RuntimeConfig {
    pub go_api_url: String,
    pub internal_api_token: Option<String>,
}

pub fn load_runtime_config() -> RuntimeConfig {
    RuntimeConfig {
        go_api_url: env::var("GO_API_URL").unwrap_or_else(|_| "http://127.0.0.1:4001".to_string()),
        internal_api_token: env::var("INTERNAL_API_TOKEN")
            .ok()
            .filter(|value| !value.is_empty()),
    }
}
