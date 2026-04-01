export function sanitizeUiText(text?: string | null) {
  if (!text) {
    return ""
  }

  return text
    .replace(/ready-demo(?=\.|\b)/gi, "ready-site")
    .replace(/pending-demo(?=\.|\b)/gi, "pending-site")
    .replace(/demo-origin/gi, "origin")
    .replace(/\/assets\/demo\.css/gi, "/assets/site.css")
    .replace(/seeded-demo-data/gi, "seeded data")
    .replace(/pre-verified demo domain/gi, "Pre-verified domain")
    .replace(/demo free plan/gi, "free plan")
    .replace(/live product demo/gi, "live product flow")
    .replace(/demo route/gi, "tracked route")
}
