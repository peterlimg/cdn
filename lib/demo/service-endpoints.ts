export function getGoApiUrl() {
  return process.env["GO_API_URL"] ?? "http://127.0.0.1:4001"
}

export function getRustEdgeUrl() {
  return process.env["RUST_EDGE_URL"] ?? "http://127.0.0.1:4002"
}

export function getDemoResetToken() {
  return process.env["DEMO_RESET_TOKEN"] ?? "demo-reset"
}

export function getInternalApiToken() {
  return process.env["INTERNAL_API_TOKEN"] ?? "demo-internal-token"
}

export function getUiPort() {
  return process.env["PORT"] ?? "3000"
}
