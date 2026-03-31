export function normalizeRequest(input: { hostname: string; path: string }) {
  return {
    hostname: input.hostname.trim().toLowerCase(),
    path: input.path.startsWith("/") ? input.path : `/${input.path}`,
  }
}
