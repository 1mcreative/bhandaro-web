import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setSession } from "./api";
import "./i18n";
import i18n from "./i18n";
import Stock from "./pages/Stock";

vi.mock("./auth", () => ({ useAuth: () => ({ can: () => true, me: { role: "OWNER" } }) }));

const ITEM = { id: "11111111-1111-1111-1111-111111111111", sku: "R1", name: "Rice", unit: "kg", barcode: null, lowStockThreshold: 5, version: 1 };
const LOC = { id: "22222222-2222-2222-2222-222222222222", name: "Main", timezone: "UTC", version: 1 };

type Posted = { key: string | null; body: any };
let posts: Posted[];
let moveResponses: Array<() => Response | Promise<Response>>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  posts = [];
  i18n.changeLanguage("en");
  setSession({ access: "a", refresh: "r" });
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init); // refresh() calls fetch(url, init)
    const url = new URL(req.url);
    if (url.pathname.endsWith("/auth/refresh")) return json({ accessToken: "a2", refreshToken: "r2", expiresIn: 600 });
    if (url.pathname.endsWith("/me")) return json({ id: "u", tenantId: "t", role: "OWNER", permissions: ["inventory.read", "inventory.write", "users.manage"] });
    if (url.pathname.endsWith("/items")) return json([ITEM]);
    if (url.pathname.endsWith("/locations")) return json([LOC]);
    if (url.pathname.endsWith("/stock/movements") && req.method === "POST") {
      posts.push({ key: req.headers.get("Idempotency-Key"), body: await req.json() });
      return moveResponses.shift()!();
    }
    return json([]);
  });
});

async function renderStock() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><Stock /></QueryClientProvider>);
  return qc;
}

async function fill(user: ReturnType<typeof userEvent.setup>, reason: string, qty: string) {
  await screen.findByRole("option", { name: /Rice/ });
  await user.selectOptions(screen.getByLabelText("Item"), ITEM.id);
  await user.selectOptions(screen.getByLabelText("Location"), LOC.id);
  await user.selectOptions(screen.getByLabelText("Reason"), reason);
  await user.type(screen.getByLabelText(/Quantity/), qty);
}

const MOVED = { movementId: "m", itemId: ITEM.id, locationId: LOC.id, delta: -2, qtyAfter: 3, reason: "SALE" };

test("a sale sends a negative delta; a retry after a network error reuses the same Idempotency-Key", async () => {
  moveResponses = [() => { throw new TypeError("network down"); }, () => json(MOVED)];
  const user = userEvent.setup();
  await renderStock();
  await fill(user, "SALE", "2");

  await user.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("status")).toHaveTextContent("New quantity: 3");

  expect(posts).toHaveLength(2);
  expect(posts[0].body).toMatchObject({ itemId: ITEM.id, locationId: LOC.id, delta: -2, reason: "SALE" });
  expect(posts[1].key).toBe(posts[0].key);
  expect(posts[0].key).toBeTruthy();
});

test("after success the next change gets a fresh key; editing the form also gets a fresh key", async () => {
  moveResponses = [() => json(MOVED), () => json(MOVED)];
  const user = userEvent.setup();
  await renderStock();
  await fill(user, "SALE", "2");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  await screen.findByRole("status");
  await user.type(screen.getByLabelText(/Quantity/), "1");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1].key).not.toBe(posts[0].key);
});

test("insufficient stock shows the translated message with numbers, in English and Hindi", async () => {
  const err = () => json({ code: "STOCK_INSUFFICIENT", params: { available: 1, requested: 2 } }, 409);
  moveResponses = [err, err];
  const user = userEvent.setup();
  await renderStock();
  await fill(user, "SALE", "2");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Not enough stock. Available: 1, needed: 2.");

  await i18n.changeLanguage("hi");
  await user.click(screen.getByRole("button", { name: "लागू करें" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("स्टॉक पर्याप्त नहीं है। उपलब्ध: 1, ज़रूरत: 2।"));
});

test("an expired access token is refreshed once and the same request (same key) is replayed", async () => {
  let first = true;
  moveResponses = [() => { if (first) { first = false; return json({ code: "UNAUTHENTICATED" }, 401); } return json(MOVED); }, () => json(MOVED)];
  const user = userEvent.setup();
  await renderStock();
  await fill(user, "SALE", "2");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("status")).toBeInTheDocument();
  expect(posts[0].key).toBe(posts[1].key);
});
