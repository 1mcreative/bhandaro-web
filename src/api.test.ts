import { api, setSession } from "./api";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let refreshCalls: number;
let seen: Array<{ url: string; auth: string | null }>;

function server(opts: { refreshStatus?: number; replayStatus?: number } = {}) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const auth = req.headers.get("Authorization");
    seen.push({ url: req.url, auth });
    if (req.url.endsWith("/auth/refresh")) {
      refreshCalls++;
      await new Promise((r) => setTimeout(r, 20)); // keep it in flight so concurrent 401s overlap
      return opts.refreshStatus && opts.refreshStatus !== 200 ? json({ code: "X" }, opts.refreshStatus) : json({ accessToken: "a2", refreshToken: "r2", expiresIn: 600 });
    }
    if (auth === "Bearer a2") return json([], opts.replayStatus ?? 200);
    return json({ code: "UNAUTHENTICATED" }, 401);
  });
}

beforeEach(() => {
  refreshCalls = 0;
  seen = [];
  setSession({ access: "a", refresh: "r" });
});
afterEach(() => setSession(null));

test("two concurrent 401s trigger exactly one refresh and both replay with the new token", async () => {
  server();
  const [x, y] = await Promise.all([api.GET("/locations"), api.GET("/items")]);
  expect(x.response.status).toBe(200);
  expect(y.response.status).toBe(200);
  expect(refreshCalls).toBe(1);
  expect(seen.filter((s) => s.auth === "Bearer a2")).toHaveLength(2);
});

test("a 5xx on refresh keeps the session; a 401 on refresh ends it", async () => {
  server({ refreshStatus: 503 });
  await api.GET("/locations");
  expect((await api.GET("/locations")).response.status).toBe(401); // still has a session, still unauthenticated
  expect(seen.some((s) => s.auth === "Bearer a")).toBe(true);

  seen = [];
  setSession({ access: "a", refresh: "r" });
  server({ refreshStatus: 401 });
  await api.GET("/locations");
  seen = [];
  await api.GET("/locations");
  expect(seen[0].auth).toBeNull(); // session cleared: no token sent any more
});

test("a 401 on the replay stops after one retry and clears the session", async () => {
  server({ replayStatus: 401 });
  const r = await api.GET("/locations");
  expect(r.response.status).toBe(401);
  expect(seen.filter((s) => s.url.endsWith("/locations"))).toHaveLength(2); // original + one replay, no loop
  seen = [];
  await api.GET("/locations");
  expect(seen[0].auth).toBeNull();
});

test("logging out while a refresh is in flight does not resurrect the session", async () => {
  server();
  const pending = api.GET("/locations");
  await new Promise((r) => setTimeout(r, 5));
  setSession(null);
  await pending;
  seen = [];
  await api.GET("/locations");
  expect(seen[0].auth).toBeNull();
});
