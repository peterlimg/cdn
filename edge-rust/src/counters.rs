use reqwest::Client;
use serde::Deserialize;
use std::env;

#[derive(Deserialize)]
struct RateLimitResponse {
    allowed: bool,
    count: i32,
}

pub async fn check_rate_limit(
    client: &Client,
    domain_id: &str,
    request_id: &str,
    trace_id: &str,
    internal_token: Option<String>,
) -> Result<(bool, i32), String> {
    let go_api_url = env::var("GO_API_URL").unwrap_or_else(|_| "http://127.0.0.1:4001".to_string());
    let response = client
        .post(format!("{go_api_url}/internal/rate-limit"))
        .header("X-Internal-Token", internal_token.unwrap_or_default())
        .json(&serde_json::json!({ "domainId": domain_id, "requestId": request_id, "traceId": trace_id }))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    let payload = response
        .json::<RateLimitResponse>()
        .await
        .map_err(|error| error.to_string())?;

    Ok((payload.allowed, payload.count))
}
