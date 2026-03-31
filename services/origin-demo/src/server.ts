export function fetchOriginAsset() {
  const payload = "/* demo-origin */\n" + "body { background: #0b1220; }\n".repeat(1200)

  return {
    body: payload,
    bytesServed: Buffer.byteLength(payload, "utf8"),
  }
}
