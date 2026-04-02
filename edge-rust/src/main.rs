mod cache;
mod config;
mod counters;
mod logging;
mod proxy;
mod request_flow;
mod waf;

use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, Response, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use request_flow::{evaluate_request, execute_request, resolve_delegate_target, RequestBody};
use serde_json::json;
use serde::Deserialize;
use std::env;
use std::net::SocketAddr;

#[derive(Clone)]
struct AppState {
    client: Client,
}

#[derive(Deserialize)]
struct ProxyQuery {
    #[serde(rename = "domainId")]
    domain_id: Option<String>,
}

#[tokio::main]
async fn main() {
    let state = AppState { client: Client::new() };
    let app = Router::new()
        .route("/health", get(|| async { Json(json!({ "status": "ok" })) }))
        .route("/proxy/{*path}", get(handle_proxy_request))
        .route("/request", post(handle_request))
        .route("/reset", post(handle_reset))
        .with_state(state);

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "4002".to_string());
    println!("{}", logging::service_start_message(&host, &port));
    let addr: SocketAddr = format!("{host}:{port}").parse().unwrap();
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handle_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<RequestBody>,
) -> Result<Json<request_flow::RequestProof>, (StatusCode, Json<serde_json::Value>)> {
    let request_id = headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());
    match resolve_delegate_target(&state.client, &body, request_id.clone()).await {
        Ok(Some(target)) => {
            return forward_request_to_target_edge(&state.client, &body, request_id, &target.node_id).await;
        }
        Ok(None) => {}
        Err(request_flow::RequestError::NotFound(error)) => {
            return Err((StatusCode::NOT_FOUND, Json(json!({ "error": error }))));
        }
        Err(request_flow::RequestError::Upstream(error)) => {
            return Err((StatusCode::BAD_GATEWAY, Json(json!({ "error": error }))));
        }
    }
    match evaluate_request(&state.client, body, request_id).await {
        Ok(proof) => Ok(Json(proof)),
        Err(request_flow::RequestError::NotFound(error)) => Err((StatusCode::NOT_FOUND, Json(json!({ "error": error })))),
        Err(request_flow::RequestError::Upstream(error)) => Err((StatusCode::BAD_GATEWAY, Json(json!({ "error": error })))),
    }
}

async fn handle_proxy_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(path): Path<String>,
    Query(query): Query<ProxyQuery>,
) -> Response<Body> {
    let request_id = headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());
    let hostname = headers
        .get(axum::http::header::HOST)
        .and_then(|value| value.to_str().ok())
        .and_then(normalize_hostname);
    let request_body = RequestBody {
        domain_id: query.domain_id,
        hostname,
        path: Some(format!("/{path}")),
        target_node_id: None,
    };

    match resolve_delegate_target(&state.client, &request_body, request_id.clone()).await {
        Ok(Some(target)) => return proxy_to_target_edge(&state.client, &request_body, request_id, &target.node_id).await,
        Ok(None) => {}
        Err(request_flow::RequestError::NotFound(error)) => {
            return with_edge_headers((StatusCode::NOT_FOUND, Json(json!({ "error": error }))).into_response(), None, None, None)
        }
        Err(request_flow::RequestError::Upstream(error)) => {
            return with_edge_headers((StatusCode::BAD_GATEWAY, Json(json!({ "error": error }))).into_response(), None, None, None)
        }
    }

    match execute_request(
        &state.client,
        request_body,
        request_id,
    )
    .await
    {
        Ok(result) => proxy_result_response(result),
        Err(request_flow::RequestError::NotFound(error)) => {
            with_edge_headers((StatusCode::NOT_FOUND, Json(json!({ "error": error }))).into_response(), None, None, None)
        }
        Err(request_flow::RequestError::Upstream(error)) => {
            with_edge_headers((StatusCode::BAD_GATEWAY, Json(json!({ "error": error }))).into_response(), None, None, None)
        }
    }
}

async fn proxy_to_target_edge(
    client: &Client,
    request: &RequestBody,
    request_id: Option<String>,
    target_node_id: &str,
) -> Response<Body> {
    let ingress_base = config::load_runtime_config().edge_ingress_url;
    let path = request.path.clone().unwrap_or_else(|| "/".to_string());
    let normalized_path = if path.starts_with('/') { path } else { format!("/{path}") };
    let mut target_url = match reqwest::Url::parse(&format!(
        "{}/edge-nodes/{}/proxy{}",
        ingress_base.trim_end_matches('/'),
        target_node_id,
        normalized_path,
    )) {
        Ok(url) => url,
        Err(error) => {
            return with_edge_headers(
                (StatusCode::BAD_GATEWAY, Json(json!({ "error": error.to_string() }))).into_response(),
                None,
                None,
                None,
            )
        }
    };

    if let Some(domain_id) = request.domain_id.as_ref() {
        target_url.query_pairs_mut().append_pair("domainId", domain_id);
    }

    let mut forwarded = client.get(target_url);
    if let Some(value) = request_id.as_ref() {
        forwarded = forwarded.header("X-Request-Id", value);
    }
    if let Some(hostname) = request.hostname.as_ref() {
        forwarded = forwarded.header(axum::http::header::HOST.as_str(), hostname);
    }

    match forwarded.send().await {
        Ok(response) => {
            let status = response.status();
            let headers = response.headers().clone();
            let body = match response.bytes().await {
                Ok(body) => body,
                Err(error) => {
                    return with_edge_headers(
                        (StatusCode::BAD_GATEWAY, Json(json!({ "error": error.to_string() }))).into_response(),
                        None,
                        None,
                        None,
                    )
                }
            };
            let mut proxied = Response::new(Body::from(body.to_vec()));
            *proxied.status_mut() = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            if let Some(content_type) = headers.get(axum::http::header::CONTENT_TYPE).cloned() {
                proxied.headers_mut().insert(axum::http::header::CONTENT_TYPE, content_type);
            }
            for header in ["x-request-id", "x-trace-id", "x-cache-status"] {
                if let Some(value) = headers.get(header).cloned() {
                    proxied.headers_mut().insert(header, value);
                }
            }
            proxied
        }
        Err(error) => with_edge_headers(
            (StatusCode::BAD_GATEWAY, Json(json!({ "error": error.to_string() }))).into_response(),
            None,
            None,
            None,
        ),
    }
}

async fn forward_request_to_target_edge(
    client: &Client,
    request: &RequestBody,
    request_id: Option<String>,
    target_node_id: &str,
) -> Result<Json<request_flow::RequestProof>, (StatusCode, Json<serde_json::Value>)> {
    let ingress_base = config::load_runtime_config().edge_ingress_url;
    let target_url = format!(
        "{}/edge-nodes/{}/request",
        ingress_base.trim_end_matches('/'),
        target_node_id,
    );

    let mut forwarded = client.post(target_url).json(request);
    if let Some(value) = request_id.as_ref() {
        forwarded = forwarded.header("X-Request-Id", value);
    }

    match forwarded.send().await {
        Ok(response) => {
            let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            let body = match response.text().await {
                Ok(body) => body,
                Err(error) => return Err((StatusCode::BAD_GATEWAY, Json(json!({ "error": error.to_string() })))),
            };
            match serde_json::from_str::<request_flow::RequestProof>(&body) {
                Ok(proof) if status.is_success() => Ok(Json(proof)),
                Ok(proof) => Err((status, Json(json!({
                    "error": proof.message,
                    "cacheStatus": proof.cache_status,
                    "servedByNodeId": proof.served_by_node_id,
                  })))),
                Err(_) => {
                    let payload: serde_json::Value = serde_json::from_str(&body).unwrap_or_else(|_| json!({ "error": body }));
                    Err((status, Json(payload)))
                }
            }
        }
        Err(error) => Err((StatusCode::BAD_GATEWAY, Json(json!({ "error": error.to_string() })))),
    }
}

fn normalize_hostname(host: &str) -> Option<String> {
    let hostname = host.split(':').next()?.trim();
    if hostname.is_empty() || hostname.eq_ignore_ascii_case("localhost") {
        return None;
    }
    Some(hostname.to_string())
}

fn proxy_result_response(result: request_flow::EvaluatedRequest) -> Response<Body> {
    let proof = &result.proof;
    if let Some(served) = result.response {
        let mut response = Response::new(Body::from(served.body));
        *response.status_mut() = StatusCode::from_u16(served.status_code).unwrap_or(StatusCode::OK);
        response.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            HeaderValue::from_str(&served.content_type).unwrap_or(HeaderValue::from_static("application/octet-stream")),
        );
        return with_edge_headers(response, Some(&proof.request_id), Some(&proof.trace_id), Some(&proof.cache_status));
    }

    let status = match proof.cache_status.as_str() {
        "BLOCKED_RATE_LIMIT" => StatusCode::TOO_MANY_REQUESTS,
        "BLOCKED_QUOTA" => StatusCode::PAYMENT_REQUIRED,
        "BLOCKED_WAF" => StatusCode::FORBIDDEN,
        "BLOCKED_PENDING" => StatusCode::CONFLICT,
        "ORIGIN_ERROR" => StatusCode::BAD_GATEWAY,
        _ => StatusCode::BAD_GATEWAY,
    };
    with_edge_headers(
        (status, Json(json!({ "error": proof.message, "cacheStatus": proof.cache_status }))).into_response(),
        Some(&proof.request_id),
        Some(&proof.trace_id),
        Some(&proof.cache_status),
    )
}

fn with_edge_headers(
    mut response: Response<Body>,
    request_id: Option<&str>,
    trace_id: Option<&str>,
    cache_status: Option<&str>,
) -> Response<Body> {
    if let Some(value) = request_id.and_then(|value| HeaderValue::from_str(value).ok()) {
        response.headers_mut().insert("x-request-id", value);
    }
    if let Some(value) = trace_id.and_then(|value| HeaderValue::from_str(value).ok()) {
        response.headers_mut().insert("x-trace-id", value);
    }
    if let Some(value) = cache_status.and_then(|value| HeaderValue::from_str(value).ok()) {
        response.headers_mut().insert("x-cache-status", value);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::proxy_result_response;
    use crate::request_flow::{EvaluatedRequest, RequestProof, ServedResponse};
    use axum::body::to_bytes;
    use axum::http::StatusCode;

    fn proof(cache_status: &str, final_disposition: &str, message: &str) -> RequestProof {
        RequestProof {
            request_id: "req-123".to_string(),
            trace_id: "trace-123".to_string(),
            domain_id: "zone-123".to_string(),
            hostname: "ready-demo.unseencdn.test".to_string(),
            path: "/assets/demo.css".to_string(),
            timestamp: "2026-03-31T00:00:00Z".to_string(),
            revision_id: "rev-1".to_string(),
            cache_status: cache_status.to_string(),
            final_disposition: final_disposition.to_string(),
            bytes_served: 18,
            quota_used_bytes: 18,
            quota_limit_bytes: 150000,
            message: message.to_string(),
            request_scope: Some("generic".to_string()),
            target_node_id: None,
            served_by_node_id: Some("edge-us-east".to_string()),
            served_by_node_label: Some("US East".to_string()),
            served_by_region: Some("us-east".to_string()),
        }
    }

    #[tokio::test]
    async fn proxy_route_returns_served_body_with_edge_headers() {
        let response = proxy_result_response(EvaluatedRequest {
            proof: proof("HIT", "served", "Served directly from edge cache."),
            response: Some(ServedResponse {
                status_code: 200,
                content_type: "text/css".to_string(),
                body: b"cached-body".to_vec(),
            }),
        });

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers().get("x-request-id").unwrap(), "req-123");
        assert_eq!(response.headers().get("x-trace-id").unwrap(), "trace-123");
        assert_eq!(response.headers().get("x-cache-status").unwrap(), "HIT");

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        assert_eq!(&body[..], b"cached-body");
    }

    #[tokio::test]
    async fn proxy_route_maps_blocked_rate_limit_to_429() {
        let response = proxy_result_response(EvaluatedRequest {
            proof: proof("BLOCKED_RATE_LIMIT", "blocked", "rate limit blocked this request"),
            response: None,
        });

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(response.headers().get("x-cache-status").unwrap(), "BLOCKED_RATE_LIMIT");

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body = String::from_utf8(body.to_vec()).unwrap();
        assert!(body.contains("rate limit blocked this request"));
    }

    #[tokio::test]
    async fn proxy_route_maps_blocked_quota_to_402() {
        let response = proxy_result_response(EvaluatedRequest {
            proof: proof("BLOCKED_QUOTA", "blocked", "quota blocked this request"),
            response: None,
        });

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        assert_eq!(response.headers().get("x-cache-status").unwrap(), "BLOCKED_QUOTA");
    }

    #[tokio::test]
    async fn proxy_route_maps_origin_error_to_502() {
        let response = proxy_result_response(EvaluatedRequest {
            proof: proof("ORIGIN_ERROR", "blocked", "Origin request could not be served"),
            response: None,
        });

        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
        assert_eq!(response.headers().get("x-cache-status").unwrap(), "ORIGIN_ERROR");
    }

    #[test]
    fn normalize_hostname_drops_port() {
        assert_eq!(super::normalize_hostname("ready-site.unseencdn.test:8081").as_deref(), Some("ready-site.unseencdn.test"));
    }
}

async fn handle_reset(headers: HeaderMap) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let token = match env::var("INTERNAL_API_TOKEN") {
        Ok(value) if !value.is_empty() => value,
        _ => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "error": "internal auth is not configured" })),
            ))
        }
    };

    let provided = headers
        .get("x-internal-token")
        .and_then(|value| value.to_str().ok());
    if provided != Some(token.as_str()) {
        return Err((StatusCode::FORBIDDEN, Json(json!({ "error": "forbidden" }))));
    }

    match cache::clear_cache_files() {
        Ok(()) => Ok(Json(json!({ "ok": true }))),
        Err(error) => Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": error })))),
    }
}
