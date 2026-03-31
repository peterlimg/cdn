use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

const BYTES_SERVED: i32 = 36_018;

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
    #[serde(rename = "activeRevisionId")]
    pub active_revision_id: String,
    #[serde(rename = "appliedRevisionId")]
    pub applied_revision_id: String,
    pub revisions: Vec<PolicyRevision>,
}

#[derive(Clone, Deserialize)]
pub struct EdgeContext {
    pub domain: DomainRecord,
    #[serde(rename = "quotaUsedBytes")]
    pub quota_used_bytes: i32,
    #[serde(rename = "quotaLimitBytes")]
    pub quota_limit_bytes: i32,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct RequestBody {
    #[serde(rename = "domainId")]
    pub domain_id: String,
    pub path: Option<String>,
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
}

#[derive(Serialize)]
struct IngestPayload {
    proof: RequestProof,
    #[serde(rename = "edgeLog")]
    edge_log: ServiceLog,
}

pub async fn evaluate_request(client: &Client, request: RequestBody) -> Result<RequestProof, String> {
    let go_api_url = env::var("GO_API_URL").unwrap_or_else(|_| "http://127.0.0.1:4001".to_string());
    let context = client
        .get(format!("{go_api_url}/internal/edge-context?domainId={}", request.domain_id))
        .send()
        .await
        .map_err(|error| error.to_string())?
        .json::<EdgeContext>()
        .await
        .map_err(|error| error.to_string())?;

    let revision = context
        .domain
        .revisions
        .iter()
        .find(|item| item.id == context.domain.applied_revision_id)
        .ok_or_else(|| "applied revision not found".to_string())?
        .clone();

    let request_id = format!("req-{}", &Uuid::new_v4().to_string()[..8]);
    let trace_id = format!("trace-{}", &Uuid::new_v4().to_string()[..8]);
    let timestamp = chrono_like_timestamp();
    let path = request.path.unwrap_or_else(|| "/assets/demo.css".to_string());

    let (cache_status, disposition, bytes_served, quota_used, message) = if context.domain.status != "ready" {
        (
            "BLOCKED_PENDING".to_string(),
            "blocked".to_string(),
            0,
            context.quota_used_bytes,
            "Domain is pending setup. Live traffic proof stays blocked until ready.".to_string(),
        )
    } else if context.quota_used_bytes >= context.quota_limit_bytes {
        (
            "BLOCKED_QUOTA".to_string(),
            "blocked".to_string(),
            0,
            context.quota_used_bytes,
            "Free plan bandwidth reached. Add more balance before serving more traffic.".to_string(),
        )
    } else if revision.cache_enabled {
        let cache_file = cache_file_name(&context.domain.id, &revision.id, &path);
        if std::path::Path::new(&cache_file).exists() {
            (
                "HIT".to_string(),
                "served".to_string(),
                BYTES_SERVED,
                context.quota_used_bytes + BYTES_SERVED,
                "Served directly from Rust edge cache.".to_string(),
            )
        } else {
            let _ = std::fs::write(&cache_file, b"cached");
            (
                "MISS".to_string(),
                "served".to_string(),
                BYTES_SERVED,
                context.quota_used_bytes + BYTES_SERVED,
                "Fetched once and stored in Rust edge cache.".to_string(),
            )
        }
    } else {
        (
            "BYPASS".to_string(),
            "served".to_string(),
            BYTES_SERVED,
            context.quota_used_bytes + BYTES_SERVED,
            "Bypassed cache and served via baseline edge path.".to_string(),
        )
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
    };

    client
        .post(format!("{go_api_url}/internal/edge-ingest"))
        .json(&IngestPayload { proof: proof.clone(), edge_log: log })
        .send()
        .await
        .map_err(|error| error.to_string())?;

    Ok(proof)
}

fn cache_file_name(domain_id: &str, revision_id: &str, path: &str) -> String {
    let safe_path = path.replace('/', "_");
    format!("/tmp/edge-cache-{domain_id}-{revision_id}-{safe_path}")
}

fn chrono_like_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let datetime: chrono::DateTime<chrono::Utc> = now.into();
    datetime.to_rfc3339()
}
