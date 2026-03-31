pub fn service_start_message(host: &str, port: &str) -> String {
    format!("rust edge service listening on {host}:{port}")
}
