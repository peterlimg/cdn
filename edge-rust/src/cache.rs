use crate::proxy::OriginResponse;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
struct CachedMetadata {
    status_code: u16,
    content_type: String,
    origin_url: String,
}

#[derive(Clone)]
pub struct CachedResponse {
    pub status_code: u16,
    pub content_type: String,
    pub body: Vec<u8>,
    pub origin_url: String,
}

impl CachedResponse {
    pub fn body_bytes(&self) -> i32 {
        self.body.len() as i32
    }
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
    let metadata =
        serde_json::from_slice::<CachedMetadata>(&metadata).map_err(|error| error.to_string())?;
    let body = std::fs::read(&body_path).map_err(|error| error.to_string())?;

    Ok(Some(CachedResponse {
        status_code: metadata.status_code,
        content_type: metadata.content_type,
        body,
        origin_url: metadata.origin_url,
    }))
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
        body: origin.body.clone(),
        origin_url: origin.origin_url.clone(),
    };
    let metadata = CachedMetadata {
        status_code: cached.status_code,
        content_type: cached.content_type.clone(),
        origin_url: cached.origin_url.clone(),
    };

    std::fs::write(body_file_name(domain_id, revision_id, path), &origin.body)
        .map_err(|error| error.to_string())?;
    std::fs::write(
        metadata_file_name(domain_id, revision_id, path),
        serde_json::to_vec(&metadata).map_err(|error| error.to_string())?,
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

#[cfg(test)]
mod tests {
    use super::{read_cached_response, write_cached_response};
    use crate::proxy::OriginResponse;
    use tempfile::TempDir;

    #[test]
    fn writes_and_reads_cached_body_and_metadata() {
        let temp_dir = TempDir::new().unwrap();
        let original_tmpdir = std::env::var("TMPDIR").ok();
        std::env::set_var("TMPDIR", temp_dir.path());

        let origin = OriginResponse {
            status_code: 200,
            content_type: "text/css".to_string(),
            body: b"body-from-origin".to_vec(),
            origin_url: "http://origin.test/assets/demo.css".to_string(),
        };

        let cached = write_cached_response("zone-1", "rev-1", "/assets/demo.css", &origin).unwrap();
        let loaded = read_cached_response("zone-1", "rev-1", "/assets/demo.css")
            .unwrap()
            .unwrap();

        assert_eq!(cached.status_code, 200);
        assert_eq!(loaded.content_type, "text/css");
        assert_eq!(loaded.body, b"body-from-origin".to_vec());
        assert_eq!(loaded.origin_url, "http://origin.test/assets/demo.css");

        match original_tmpdir {
            Some(value) => std::env::set_var("TMPDIR", value),
            None => std::env::remove_var("TMPDIR"),
        }
    }
}
