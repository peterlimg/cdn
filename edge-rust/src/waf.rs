pub fn evaluate_path(path: &str) -> Option<String> {
    if path.contains("..") || path.contains("waf-test") {
        return Some("Basic Rust edge WAF blocked a suspicious request path before cache or origin handling.".to_string());
    }

    None
}
