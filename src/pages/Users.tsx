import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, call } from "../api";
import type { components } from "../api-types";
import { useAuth } from "../auth";
import { ErrorNote, Field } from "../components/ui";

type Role = components["schemas"]["Role"];
const ROLES: Role[] = ["OWNER", "ADMIN", "WRITER", "READER"];

export default function Users() {
  const { t, i18n } = useTranslation();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("READER");
  const list = useQuery({ queryKey: ["users"], queryFn: () => call(api.GET("/users")) });

  const create = useMutation({
    mutationFn: () => call(api.POST("/users", { body: { email: email.trim(), password, role, locale: i18n.language } })),
    onSuccess: () => { setEmail(""); setPassword(""); qc.invalidateQueries({ queryKey: ["users"] }); },
  });
  const update = useMutation({
    mutationFn: (v: { id: string; role: Role; active: boolean }) =>
      call(api.PUT("/users/{id}", { params: { path: { id: v.id } }, body: { role: v.role, active: v.active } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  // the server enforces who may grant what; the UI just does not offer roles the user cannot grant
  const grantable = me?.role === "OWNER" ? ROLES : (["WRITER", "READER"] as Role[]);

  return (
    <>
      <h1>{t("users.title")}</h1>
      <form className="card grid" onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }}>
        <h2>{t("users.new")}</h2>
        <Field label={t("users.email")}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label={t("auth.password")} hint={t("auth.passwordHint")}>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} maxLength={128} />
        </Field>
        <Field label={t("users.role")}>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>{grantable.map((r) => <option key={r} value={r}>{t(`users.roles.${r}`)}</option>)}</select>
        </Field>
        <ErrorNote error={create.error} />
        <button type="submit" disabled={create.isPending}>{t("common.add")}</button>
      </form>
      <ErrorNote error={list.error ?? update.error} />
      {list.isPending ? <p>{t("common.loading")}</p> : (
        <div className="scroll"><table>
          <thead><tr><th>{t("users.email")}</th><th>{t("users.role")}</th><th>{t("users.active")}</th><th>{t("users.created")}</th></tr></thead>
          <tbody>{list.data?.map((u) => {
            const self = u.id === me?.id;
            return (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td><select aria-label={t("users.role")} disabled={self} value={u.role}
                  onChange={(e) => update.mutate({ id: u.id, role: e.target.value as Role, active: u.active })}>
                  {ROLES.map((r) => <option key={r} value={r}>{t(`users.roles.${r}`)}</option>)}</select></td>
                <td><input type="checkbox" aria-label={t("users.active")} disabled={self} checked={u.active}
                  onChange={(e) => update.mutate({ id: u.id, role: u.role, active: e.target.checked })} /></td>
                <td>{new Date(u.createdAt).toLocaleDateString(i18n.language)}</td>
              </tr>);
          })}</tbody>
        </table></div>
      )}
    </>
  );
}
