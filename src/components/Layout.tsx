import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import { LANGUAGES, setLanguage } from "../i18n";

export default function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { me, can, logout } = useAuth();
  return (
    <>
      <header className="bar">
        <strong className="brand">{t("app.name")}</strong>
        <nav aria-label={t("common.mainNav")}>
          <NavLink to="/stock">{t("nav.stock")}</NavLink>
          <NavLink to="/items">{t("nav.items")}</NavLink>
          <NavLink to="/locations">{t("nav.locations")}</NavLink>
          {can("users.manage") && <NavLink to="/users">{t("nav.users")}</NavLink>}
        </nav>
        <span className="spacer" />
        <label className="inline">
          <span className="sr">{t("common.language")}</span>
          <select value={i18n.language} onChange={(e) => setLanguage(e.target.value)}>
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </label>
        <span className="muted">{me ? t(`users.roles.${me.role}`) : ""}</span>
        <button className="ghost" onClick={() => logout()}>{t("common.logout")}</button>
      </header>
      <main>{children}</main>
    </>
  );
}
