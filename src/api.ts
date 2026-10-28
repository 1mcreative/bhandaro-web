import createClient from "openapi-fetch";
import type { paths } from "./api-types";

const API_URL: string = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:8080");
if (import.meta.env.PROD && !API_URL) throw new Error("VITE_API_URL must be set for production builds");
const BASE = `${API_URL}/api/v1`;
const BASE_ORIGIN = new URL(BASE, location.href).origin;
const AUTH_PREFIX = new URL(`${BASE}/auth/`, location.href).pathname;

/** Tokens live in memory only (by design): they survive navigation, not a page reload. */
type Session = { access: string; refresh: string } | null;
let session: Session = null;
const listeners = new Set<() => void>();

export function setSession(s: Session) {
  session = s;
  listeners.forEach((l) => l());
}
export const currentRefreshToken = () => session?.refresh ?? null;
export function onSessionChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

let refreshing: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  const used = session?.refresh;
  if (!used) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: used }),
      });
      if (!r.ok) {
        // only a definite rejection ends the session; a 5xx/429 must not log the user out
        if ([400, 401, 403].includes(r.status) && session?.refresh === used) setSession(null);
        return false;
      }
      const t = await r.json();
      if (session?.refresh !== used) return false; // logged out (or replaced) while waiting: do not resurrect
      session = { access: t.accessToken, refresh: t.refreshToken };
      return true;
    } catch {
      return false; // network error: keep the session, the user can retry
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Adds the token (our API origin only); on 401 refreshes once and replays the same request (same Idempotency-Key). */
async function authedFetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ours = url.origin === BASE_ORIGIN;
  const retry = req.clone();
  const sent = ours ? session?.access : undefined;
  if (sent) req.headers.set("Authorization", `Bearer ${sent}`);
  const res = await fetch(req);
  if (res.status !== 401 || !sent || url.pathname.startsWith(AUTH_PREFIX) || !session) return res;
  // another request may already have refreshed: then just replay with the new token
  if (session.access === sent && !(await refresh())) return res;
  if (!session) return res;
  retry.headers.set("Authorization", `Bearer ${session.access}`);
  const again = await fetch(retry);
  if (again.status === 401) setSession(null); // refreshed token rejected too: session is dead
  return again;
}

export const api = createClient<paths>({ baseUrl: BASE, fetch: authedFetch });

export class ApiError extends Error {
  constructor(public status: number, public code: string, public params: Record<string, unknown> = {}) {
    super(code);
  }
}

/** Turns openapi-fetch's {data, error} into data-or-throw. */
export async function call<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const r = await p;
  if (r.error !== undefined || !r.response.ok) {
    const e = r.error as { code?: string; params?: Record<string, unknown> } | undefined;
    const fallback = r.response.status === 401 ? "UNAUTHENTICATED" : r.response.status === 403 ? "FORBIDDEN" : "UNKNOWN";
    throw new ApiError(r.response.status, e?.code ?? fallback, e?.params);
  }
  return r.data as T;
}
