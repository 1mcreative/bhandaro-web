import createClient from "openapi-fetch";
import type { paths } from "./api-types";

const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8080"}/api/v1`;

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
  if (!session) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session!.refresh }),
      });
      if (!r.ok) {
        setSession(null);
        return false;
      }
      const t = await r.json();
      session = { access: t.accessToken, refresh: t.refreshToken };
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Adds the token; on 401 refreshes once and replays the same request (same Idempotency-Key). */
async function authedFetch(req: Request): Promise<Response> {
  const retry = req.clone();
  if (session) req.headers.set("Authorization", `Bearer ${session.access}`);
  const res = await fetch(req);
  if (res.status === 401 && !req.url.includes("/auth/") && (await refresh())) {
    retry.headers.set("Authorization", `Bearer ${session!.access}`);
    return fetch(retry);
  }
  return res;
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
