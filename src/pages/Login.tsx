import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth";
import { ErrorNote, Field } from "../components/ui";
import { LANGUAGES, setLanguage } from "../i18n";

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [business, setBusiness] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(business, email, password, i18n.language);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="narrow">
      <h1>{t("app.name")}</h1>
      <p className="muted">{t("app.tagline")}</p>
      <form onSubmit={submit} className="card">
        <h2>{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
        {mode === "register" && (
          <Field label={t("auth.businessName")}>
            <input value={business} onChange={(e) => setBusiness(e.target.value)} required maxLength={100} />
          </Field>
        )}
        <Field label={t("auth.email")}>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label={t("auth.password")} hint={mode === "register" ? t("auth.passwordHint") : undefined}>
          <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 10 : 1} maxLength={128} />
        </Field>
        <ErrorNote error={error} />
        <button type="submit" disabled={busy}>{mode === "login" ? t("auth.signIn") : t("auth.createAccount")}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
        </button>
        <p className="muted small">{t("auth.sessionNote")}</p>
      </form>
      <label className="inline">
        <span>{t("common.language")}</span>
        <select value={i18n.language} onChange={(e) => setLanguage(e.target.value)}>
          {Object.entries(LANGUAGES).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
        </select>
      </label>
    </main>
  );
}
