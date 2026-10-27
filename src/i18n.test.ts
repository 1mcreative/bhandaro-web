import en from "./locales/en.json";
import hi from "./locales/hi.json";
import spec from "../openapi.yaml?raw";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v as object, `${p}${k}.`) : [`${p}${k}`]));
const placeholders = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();
const get = (o: any, path: string) => path.split(".").reduce((a, k) => a[k], o) as string;

test("every English key exists in Hindi with the same placeholders, and vice versa", () => {
  expect(keys(hi).sort()).toEqual(keys(en).sort());
  for (const k of keys(en)) expect(placeholders(get(hi, k)), k).toBe(placeholders(get(en, k)));
});

test("every error code in the API contract has a message", () => {
  const line = spec.match(/description: "Stable machine code, e\.g\. ([^"]+)"/)![1];
  for (const code of line.split(",").map((s: string) => s.trim())) expect(get(en, `errors.${code}`), code).toBeTruthy();
});
