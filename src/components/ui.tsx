import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "../errors";

export function ErrorNote({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return error ? <p role="alert" className="note error">{errorMessage(t, error)}</p> : null;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function useNumber() {
  const { i18n } = useTranslation();
  return (n: number | null | undefined) => (n == null ? "" : new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }).format(n));
}
