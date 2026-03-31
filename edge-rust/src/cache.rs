use crate::proxy::OriginResponse;
use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, Serialize)]
pub struct CachedResponse {
    pub status_code: u16,
    pub content_type: String,
    pub body_bytes: i32,
    pub origin_url: String,
}

pub fn read_cached_response(
    domain_id: &str,
    revision_id: &str,
    path: &str,
) -> Result<Option<CachedResponse>, String> {
    let metadata_path = metadata_file_name(domain_id, revision_id, path);
    let body_path = body_file_name(domain_id, revision_id, path);
    if !std::path::Path::new(&metadata_path).exists() || !std::path::Path::new(&body_path).exists()
    {
        return Ok(None);
    }

    let metadata = std::fs::read(&metadata_path).map_err(|error| error.to_string())?;
    let mut cached =
        serde_json::from_slice::<CachedResponse>(&metadata).map_err(|error| error.to_string())?;
    cached.body_bytes = std::fs::metadata(&body_path)
        .map_err(|error| error.to_string())?
        .len() as i32;
    Ok(Some(cached))
}

pub fn write_cached_response(
    domain_id: &str,
    revision_id: &str,
    path: &str,
    origin: &OriginResponse,
) -> Result<CachedResponse, String> {
    let cached = CachedResponse {
        status_code: origin.status_code,
        content_type: origin.content_type.clone(),
        body_bytes: origin.body_bytes(),
        origin_url: origin.origin_url.clone(),
    };

    std::fs::write(body_file_name(domain_id, revision_id, path), &origin.body)
        .map_err(|error| error.to_string())?;
    std::fs::write(
        metadata_file_name(domain_id, revision_id, path),
        serde_json::to_vec(&cached).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;

    Ok(cached)
}

pub fn clear_cache_files() -> Result<(), String> {
    let entries = std::fs::read_dir("/tmp").map_err(|error| error.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("edge-cache-") {
            std::fs::remove_file(entry.path()).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn body_file_name(domain_id: &str, revision_id: &str, path: &str) -> String {
    format!("{}.body", cache_base_name(domain_id, revision_id, path))
}

fn metadata_file_name(domain_id: &str, revision_id: &str, path: &str) -> String {
    format!("{}.json", cache_base_name(domain_id, revision_id, path))
}

fn cache_base_name(domain_id: &str, revision_id: &str, path: &str) -> String {
    let safe_path = path.replace('/', "_");
    format!("/tmp/edge-cache-{domain_id}-{revision_id}-{safe_path}")
}
