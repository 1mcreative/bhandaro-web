import type { TFunction } from "i18next";
import { ApiError } from "./api";

/** Server sends codes; the words live in the locale files. */
export function errorMessage(t: TFunction, e: unknown): string {
  const code = e instanceof ApiError ? e.code : "NETWORK";
  const params = e instanceof ApiError ? e.params : {};
  return t(`errors.${code}`, { ...params, defaultValue: t("errors.UNKNOWN") });
}
