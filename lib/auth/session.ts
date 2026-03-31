import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const SESSION_COOKIE = "northstar_session"
const SESSION_SECRET = process.env.SESSION_SECRET ?? "northstar-demo-session-secret"

function sign(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex")
}

function encodeSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ email }), "utf8").toString("base64url")
  return `${payload}.${sign(payload)}`
}

function decodeSession(token: string | undefined | null): { email: string } | null {
  if (!token) {
    return null
  }

  const [payload, signature] = token.split(".")
  if (!payload || !signature) {
    return null
  }

  const expected = sign(payload)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string }
    if (!parsed.email) {
      return null
    }
    return { email: parsed.email }
  } catch {
    return null
  }
}

export async function getSession() {
  const store = await cookies()
  return decodeSession(store.get(SESSION_COOKIE)?.value)
}

export async function createSession(email: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, encodeSession(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
