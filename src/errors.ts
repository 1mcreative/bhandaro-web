import type { TFunction } from "i18next";
import { ApiError } from "./api";
import i18n from "./i18n";

/** Server sends codes; the words live in the locale files. Numbers in params are formatted for the user's language. */
export function errorMessage(t: TFunction, e: unknown): string {
  const code = e instanceof ApiError ? e.code : "NETWORK";
  const fmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 });
  const params = Object.fromEntries(
    Object.entries(e instanceof ApiError ? e.params : {}).map(([k, v]) => [k, typeof v === "number" ? fmt.format(v) : v]),
  );
  return t(`errors.${code}`, { ...params, defaultValue: t("errors.UNKNOWN") });
}
