import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, call } from "../api";
import type { components } from "../api-types";
import { useAuth } from "../auth";
import { ErrorNote, Field } from "../components/ui";

type Location = components["schemas"]["Location"];

export default function Locations() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [tz, setTz] = useState("");
  const list = useQuery({ queryKey: ["locations"], queryFn: () => call(api.GET("/locations")) });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), timezone: tz.trim() || null };
      return editing
        ? call(api.PUT("/locations/{id}", { params: { path: { id: editing.id } }, body }))
        : call(api.POST("/locations", { body }));
    },
    onSuccess: () => { setEditing(null); setName(""); setTz(""); qc.invalidateQueries({ queryKey: ["locations"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => call(api.DELETE("/locations/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
  const write = can("inventory.write");

  return (
    <>
      <h1>{t("locations.title")}</h1>
      {write && (
        <form className="card grid" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
          <h2>{editing ? t("locations.edit") : t("locations.new")}</h2>
          <Field label={t("common.name")}><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field>
          <Field label={t("locations.timezone")} hint={t("locations.timezoneHint")}><input value={tz} onChange={(e) => setTz(e.target.value)} maxLength={64} /></Field>
          <ErrorNote error={save.error} />
          <div className="row">
            <button type="submit" disabled={save.isPending}>{t("common.save")}</button>
            {editing && <button type="button" className="ghost" onClick={() => { setEditing(null); setName(""); setTz(""); }}>{t("common.cancel")}</button>}
          </div>
        </form>
      )}
      <ErrorNote error={list.error ?? remove.error} />
      {list.isPending ? <p>{t("common.loading")}</p> : list.data?.length === 0 ? <p className="muted">{t("common.empty")}</p> : (
        <div className="scroll"><table>
          <thead><tr><th>{t("common.name")}</th><th>{t("locations.timezone")}</th>{write && <th>{t("common.actions")}</th>}</tr></thead>
          <tbody>{list.data?.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td><td>{l.timezone}</td>
              {write && <td className="row">
                <button className="ghost" onClick={() => { setEditing(l); setName(l.name); setTz(l.timezone); }}>{t("common.edit")}</button>
                <button className="ghost danger" onClick={() => window.confirm(t("common.confirmDelete", { name: l.name })) && remove.mutate(l.id)}>{t("common.delete")}</button>
              </td>}
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
