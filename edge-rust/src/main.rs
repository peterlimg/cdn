mod counters;
mod logging;
mod request_flow;

use axum::{extract::State, routing::{get, post}, Json, Router};
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
    Json(body): Json<RequestBody>,
) -> Result<Json<request_flow::RequestProof>, Json<serde_json::Value>> {
    match evaluate_request(&state.client, body).await {
        Ok(proof) => Ok(Json(proof)),
        Err(error) => Err(Json(json!({ "error": error }))),
    }
}
