mod cache;
mod config;
mod counters;
mod logging;
mod proxy;
mod request_flow;
mod waf;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use request_flow::{evaluate_request, RequestBody};
use serde_json::json;
use std::env;
use std::net::SocketAddr;

#[derive(Clone)]
struct AppState {
    client: Client,
}

#[tokio::main]
async fn main() {
    let state = AppState { client: Client::new() };
    let app = Router::new()
        .route("/health", get(|| async { Json(json!({ "status": "ok" })) }))
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
    match evaluate_request(&state.client, body, request_id).await {
        Ok(proof) => Ok(Json(proof)),
        Err(request_flow::RequestError::NotFound(error)) => Err((StatusCode::NOT_FOUND, Json(json!({ "error": error })))),
        Err(request_flow::RequestError::Upstream(error)) => Err((StatusCode::BAD_GATEWAY, Json(json!({ "error": error })))),
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
