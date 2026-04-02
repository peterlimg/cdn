export function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  try {
    const url = new URL(value, "http://unseen.local")
    if (url.origin !== "http://unseen.local") {
      return null
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function loginPath(nextPath?: string | null) {
  const safeNextPath = sanitizeNextPath(nextPath)
  if (!safeNextPath) {
    return "/login"
  }

  return `/login?next=${encodeURIComponent(safeNextPath)}`
}
