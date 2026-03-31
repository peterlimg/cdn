use reqwest::{header::CONTENT_TYPE, Client};

pub enum OriginFetchError {
    NotFound(String),
    Upstream(String),
}

pub struct OriginResponse {
    pub status_code: u16,
    pub content_type: String,
    pub body: Vec<u8>,
    pub origin_url: String,
}

impl OriginResponse {
    pub fn body_bytes(&self) -> i32 {
        self.body.len() as i32
    }
}

pub async fn fetch_origin_response(client: &Client, origin_base_url: &str, path: &str, request_id: &str) -> Result<OriginResponse, OriginFetchError> {
    let base = origin_base_url.trim_end_matches('/');
    let normalized_path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    };
    let origin_url = format!("{base}{normalized_path}");

    let response = client
        .get(&origin_url)
        .header("X-Request-Id", request_id)
        .send()
        .await
        .map_err(|error| OriginFetchError::Upstream(error.to_string()))?;

    let status_code = response.status().as_u16();
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(OriginFetchError::NotFound(format!("origin asset not found at {origin_url}")));
    }
    if !response.status().is_success() {
        return Err(OriginFetchError::Upstream(format!("origin fetch failed with status {status_code}")));
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();
    let body = response
        .bytes()
        .await
        .map_err(|error| OriginFetchError::Upstream(error.to_string()))?
        .to_vec();

    Ok(OriginResponse {
        status_code,
        content_type,
        body,
        origin_url,
    })
}
