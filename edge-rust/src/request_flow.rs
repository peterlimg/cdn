use crate::{cache, config, counters, proxy, waf};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

#[derive(Clone, Deserialize, Serialize)]
pub struct PolicyRevision {
    pub id: String,
    #[serde(rename = "cacheEnabled")]
    pub cache_enabled: bool,
    pub label: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct DomainRecord {
    pub id: String,
    pub hostname: String,
    pub origin: String,
    pub status: String,
    #[serde(rename = "rateLimit")]
    pub rate_limit: i32,
    #[serde(rename = "activeRevisionId")]
    pub active_revision_id: String,
    #[serde(rename = "appliedRevisionId")]
    pub applied_revision_id: String,
    #[serde(rename = "edgePlacement")]
    pub edge_placement: Option<EdgePlacement>,
    pub revisions: Vec<PolicyRevision>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct EdgePlacement {
    #[serde(rename = "targetNodeIds")]
    pub target_node_ids: Vec<String>,
}

#[derive(Clone, Deserialize)]
pub struct EdgeContext {
    pub domain: DomainRecord,
    #[serde(rename = "quotaUsedBytes")]
    pub quota_used_bytes: i32,
    #[serde(rename = "quotaLimitBytes")]
    pub quota_limit_bytes: i32,
    #[serde(rename = "rateLimitWindow")]
    pub rate_limit_window: i32,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct RequestBody {
    #[serde(rename = "domainId")]
    pub domain_id: Option<String>,
    #[serde(default)]
    pub hostname: Option<String>,
    pub path: Option<String>,
    #[serde(rename = "targetNodeId")]
    pub target_node_id: Option<String>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct RequestProof {
    #[serde(rename = "requestId")]
    pub request_id: String,
    #[serde(rename = "traceId")]
    pub trace_id: String,
    #[serde(rename = "domainId")]
    pub domain_id: String,
    pub hostname: String,
    pub path: String,
    pub timestamp: String,
    #[serde(rename = "revisionId")]
    pub revision_id: String,
    #[serde(rename = "cacheStatus")]
    pub cache_status: String,
    #[serde(rename = "finalDisposition")]
    pub final_disposition: String,
    #[serde(rename = "bytesServed")]
    pub bytes_served: i32,
    #[serde(rename = "quotaUsedBytes")]
    pub quota_used_bytes: i32,
    #[serde(rename = "quotaLimitBytes")]
    pub quota_limit_bytes: i32,
    pub message: String,
    #[serde(rename = "requestScope", skip_serializing_if = "Option::is_none")]
    pub request_scope: Option<String>,
    #[serde(rename = "targetNodeId", skip_serializing_if = "Option::is_none")]
    pub target_node_id: Option<String>,
    #[serde(rename = "servedByNodeId", skip_serializing_if = "Option::is_none")]
    pub served_by_node_id: Option<String>,
    #[serde(rename = "servedByNodeLabel", skip_serializing_if = "Option::is_none")]
    pub served_by_node_label: Option<String>,
    #[serde(rename = "servedByRegion", skip_serializing_if = "Option::is_none")]
    pub served_by_region: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct ServiceLog {
    pub id: String,
    pub service: String,
    pub level: String,
    #[serde(rename = "requestId")]
    pub request_id: String,
    #[serde(rename = "traceId")]
    pub trace_id: String,
    #[serde(rename = "domainId")]
    pub domain_id: String,
    #[serde(rename = "revisionId")]
    pub revision_id: String,
    pub event: String,
    pub outcome: String,
    pub message: String,
    pub timestamp: String,
    #[serde(rename = "nodeId", skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
    #[serde(rename = "nodeLabel", skip_serializing_if = "Option::is_none")]
    pub node_label: Option<String>,
    #[serde(rename = "nodeRegion", skip_serializing_if = "Option::is_none")]
    pub node_region: Option<String>,
}

#[derive(Serialize)]
struct EdgeApplyPayload {
    #[serde(rename = "domainId")]
    domain_id: String,
    #[serde(rename = "nodeId")]
    node_id: String,
    #[serde(rename = "revisionId")]
    revision_id: String,
    status: String,
    message: String,
    timestamp: String,
}

pub struct ServedResponse {
    pub status_code: u16,
    pub content_type: String,
    pub body: Vec<u8>,
}

pub struct EvaluatedRequest {
    pub proof: RequestProof,
    pub response: Option<ServedResponse>,
}

#[derive(Serialize)]
struct IngestPayload {
    proof: RequestProof,
    #[serde(rename = "edgeLog")]
    edge_log: ServiceLog,
}

pub enum RequestError {
    NotFound(String),
    Upstream(String),
}

impl fmt::Display for RequestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RequestError::NotFound(message) => write!(f, "{message}"),
            RequestError::Upstream(message) => write!(f, "{message}"),
        }
    }
}

pub async fn evaluate_request(client: &Client, request: RequestBody, ingress_request_id: Option<String>) -> Result<RequestProof, RequestError> {
    Ok(execute_request(client, request, ingress_request_id).await?.proof)
}

pub async fn execute_request(client: &Client, request: RequestBody, ingress_request_id: Option<String>) -> Result<EvaluatedRequest, RequestError> {
    let runtime = config::load_runtime_config();
    let request_id = ingress_request_id.unwrap_or_else(|| format!("req-{}", &Uuid::new_v4().to_string()[..8]));
    let trace_id = format!("trace-{}", &Uuid::new_v4().to_string()[..8]);

    if request.domain_id.is_none() && request.hostname.is_none() {
        return Err(RequestError::NotFound("domainId or hostname is required".to_string()));
    }

    let mut edge_context_url = reqwest::Url::parse(&format!("{}/internal/edge-context", runtime.go_api_url))
        .map_err(|error| RequestError::Upstream(error.to_string()))?;
    {
        let mut query = edge_context_url.query_pairs_mut();
        query.append_pair("requestId", &request_id);
        query.append_pair("traceId", &trace_id);
        if let Some(domain_id) = request.domain_id.as_ref() {
            query.append_pair("domainId", domain_id);
        }
        if let Some(hostname) = request.hostname.as_ref() {
            query.append_pair("hostname", hostname);
        }
    }

    let context = client
        .get(edge_context_url)
        .header("X-Internal-Token", runtime.internal_api_token.clone().unwrap_or_default())
        .send()
        .await
        .map_err(|error| RequestError::Upstream(error.to_string()))?
        .error_for_status()
        .map_err(|error| map_status_error(error, "edge context lookup failed"))?
        .json::<EdgeContext>()
        .await
        .map_err(|error| RequestError::Upstream(error.to_string()))?;

    let revision = context
        .domain
        .revisions
        .iter()
        .find(|item| item.id == context.domain.active_revision_id)
        .ok_or_else(|| RequestError::Upstream("active revision not found".to_string()))?
        .clone();

    if let Some(target_node_id) = request.target_node_id.as_ref() {
        if target_node_id != &runtime.node_id {
            return Err(RequestError::NotFound("target edge node is not available on this runtime".to_string()));
        }
    }

    if let Some(placement) = context.domain.edge_placement.as_ref() {
        if !placement.target_node_ids.iter().any(|node_id| node_id == &runtime.node_id) {
            return Err(RequestError::NotFound("domain is not targeted to this edge node".to_string()));
        }
    }

    let timestamp = chrono_like_timestamp();
    let path = request.path.unwrap_or_else(|| "/assets/demo.css".to_string());

    acknowledge_apply(
        client,
        &runtime,
        &context.domain.id,
        &revision.id,
        &timestamp,
        &format!("{} applied revision {}", runtime.node_label, revision.id),
    )
    .await
    .map_err(RequestError::Upstream)?;

    let (cache_status, disposition, bytes_served, quota_used, message, response): (String, String, i32, i32, String, Option<ServedResponse>) = if context.domain.status != "ready" {
        (
            "BLOCKED_PENDING".to_string(),
            "blocked".to_string(),
            0,
            context.quota_used_bytes,
            "Domain is pending setup. Live traffic proof stays blocked until ready.".to_string(),
            None,
        )
    } else if let Some(waf_message) = waf::evaluate_path(&path) {
        (
            "BLOCKED_WAF".to_string(),
            "blocked".to_string(),
            0,
            context.quota_used_bytes,
            waf_message,
            None,
        )
    } else {
        let rate_limit = counters::check_rate_limit(
            client,
            &context.domain.id,
            &request_id,
            &trace_id,
            runtime.internal_api_token.clone(),
        )
            .await
            .map_err(RequestError::Upstream)?;
        if !rate_limit.0 {
            (
                "BLOCKED_RATE_LIMIT".to_string(),
                "blocked".to_string(),
                0,
                context.quota_used_bytes,
                format!(
                    "Redis-backed rate limit blocked this request after {} requests in the active {} second window.",
                    rate_limit.1,
                    context.rate_limit_window
                ),
                None,
            )
        } else if context.quota_used_bytes >= context.quota_limit_bytes {
            (
                "BLOCKED_QUOTA".to_string(),
                "blocked".to_string(),
                0,
                context.quota_used_bytes,
                "Free plan bandwidth reached. Add more balance before serving more traffic.".to_string(),
                None,
            )
        } else if revision.cache_enabled {
            if let Some(cached) = cache::read_cached_response(&context.domain.id, &revision.id, &path).map_err(RequestError::Upstream)? {
                (
                    "HIT".to_string(),
                    "served".to_string(),
                    cached.body_bytes(),
                    context.quota_used_bytes + cached.body_bytes(),
                    format!(
                        "Served {} bytes from Rust edge cache for {}.",
                        cached.body_bytes(), path
                    ),
                    Some(ServedResponse {
                        status_code: cached.status_code,
                        content_type: cached.content_type.clone(),
                        body: cached.body.clone(),
                    }),
                )
            } else {
                match proxy::fetch_origin_response(client, &context.domain.origin, &path, &request_id).await {
                    Ok(origin) => {
                        let cached = cache::write_cached_response(&context.domain.id, &revision.id, &path, &origin)
                            .map_err(RequestError::Upstream)?;
                        (
                            "MISS".to_string(),
                            "served".to_string(),
                            cached.body_bytes(),
                            context.quota_used_bytes + cached.body_bytes(),
                            format!(
                                "Fetched {} bytes from {} and stored the response in Rust edge cache.",
                                cached.body_bytes(), cached.origin_url
                            ),
                            Some(ServedResponse {
                                status_code: cached.status_code,
                                content_type: cached.content_type.clone(),
                                body: cached.body.clone(),
                            }),
                        )
                    }
                    Err(error) => origin_error_outcome(error, context.quota_used_bytes),
                }
            }
        } else {
            match proxy::fetch_origin_response(client, &context.domain.origin, &path, &request_id).await {
                Ok(origin) => (
                    "BYPASS".to_string(),
                    "served".to_string(),
                    origin.body_bytes(),
                    context.quota_used_bytes + origin.body_bytes(),
                    format!(
                        "Fetched {} bytes from {} with cache policy disabled.",
                        origin.body_bytes(), origin.origin_url
                    ),
                    Some(ServedResponse {
                        status_code: origin.status_code,
                        content_type: origin.content_type.clone(),
                        body: origin.body.clone(),
                    }),
                ),
                Err(error) => origin_error_outcome(error, context.quota_used_bytes),
            }
        }
    };

    let proof = RequestProof {
        request_id: request_id.clone(),
        trace_id: trace_id.clone(),
        domain_id: context.domain.id.clone(),
        hostname: context.domain.hostname.clone(),
        path: path.clone(),
        timestamp: timestamp.clone(),
        revision_id: revision.id.clone(),
        cache_status: cache_status.clone(),
        final_disposition: disposition.clone(),
        bytes_served,
        quota_used_bytes: quota_used,
        quota_limit_bytes: context.quota_limit_bytes,
        message: message.clone(),
        request_scope: Some(if request.target_node_id.is_some() { "node-targeted".to_string() } else { "generic".to_string() }),
        target_node_id: request.target_node_id.clone(),
        served_by_node_id: Some(runtime.node_id.clone()),
        served_by_node_label: Some(runtime.node_label.clone()),
        served_by_region: Some(runtime.node_region.clone()),
    };

    let log = ServiceLog {
        id: String::new(),
        service: "edge".to_string(),
        level: "INFO".to_string(),
        request_id: request_id,
        trace_id,
        domain_id: context.domain.id,
        revision_id: revision.id,
        event: "edge.evaluate".to_string(),
        outcome: cache_status.clone(),
        message: format!("Rust edge evaluated request with outcome {cache_status}"),
        timestamp,
        node_id: Some(runtime.node_id.clone()),
        node_label: Some(runtime.node_label.clone()),
        node_region: Some(runtime.node_region.clone()),
    };

    client
        .post(format!("{}/internal/edge-ingest", runtime.go_api_url))
        .header("X-Internal-Token", runtime.internal_api_token.unwrap_or_default())
        .json(&IngestPayload { proof: proof.clone(), edge_log: log })
        .send()
        .await
        .map_err(|error| RequestError::Upstream(error.to_string()))?
        .error_for_status()
        .map_err(|error| map_status_error(error, "edge ingest failed"))?;

    Ok(EvaluatedRequest { proof, response })
}

async fn acknowledge_apply(
    client: &Client,
    runtime: &config::RuntimeConfig,
    domain_id: &str,
    revision_id: &str,
    timestamp: &str,
    message: &str,
) -> Result<(), String> {
    client
        .post(format!("{}/internal/edge-apply", runtime.go_api_url))
        .header("X-Internal-Token", runtime.internal_api_token.clone().unwrap_or_default())
        .json(&EdgeApplyPayload {
            domain_id: domain_id.to_string(),
            node_id: runtime.node_id.clone(),
            revision_id: revision_id.to_string(),
            status: "applied".to_string(),
            message: message.to_string(),
            timestamp: timestamp.to_string(),
        })
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| match error.status() {
            Some(status) => format!("edge apply ack failed with {status}: {error}"),
            None => format!("edge apply ack failed: {error}"),
        })?;
    Ok(())
}

fn origin_error_outcome(error: proxy::OriginFetchError, quota_used_bytes: i32) -> (String, String, i32, i32, String, Option<ServedResponse>) {
    let message = match error {
        proxy::OriginFetchError::NotFound(message) => message,
        proxy::OriginFetchError::Upstream(message) => message,
    };
    (
        "ORIGIN_ERROR".to_string(),
        "blocked".to_string(),
        0,
        quota_used_bytes,
        format!("Origin request could not be served: {message}"),
        None,
    )
}

fn map_status_error(error: reqwest::Error, default_message: &str) -> RequestError {
    match error.status() {
        Some(reqwest::StatusCode::NOT_FOUND) => RequestError::NotFound(default_message.to_string()),
        _ => RequestError::Upstream(default_message.to_string()),
    }
}
fn chrono_like_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let datetime: chrono::DateTime<chrono::Utc> = now.into();
    datetime.to_rfc3339()
}
