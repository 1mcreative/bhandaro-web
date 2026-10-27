import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, call } from "../api";
import type { components } from "../api-types";
import { useAuth } from "../auth";
import { ErrorNote, Field, useNumber } from "../components/ui";

type Item = components["schemas"]["Item"];
type Draft = { sku: string; name: string; unit: string; barcode: string; low: string };
const EMPTY: Draft = { sku: "", name: "", unit: "pcs", barcode: "", low: "" };

export default function Items() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const num = useNumber();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  // shortcut: first 500 items only, no paging UI; add a cursor list when a store has more
  const list = useQuery({ queryKey: ["items"], queryFn: () => call(api.GET("/items", { params: { query: { limit: 500 } } })) });

  const save = useMutation({
    mutationFn: () => {
      const body = { sku: draft.sku.trim(), name: draft.name.trim(), unit: draft.unit.trim(), barcode: draft.barcode.trim() || null,
        lowStockThreshold: draft.low === "" ? null : Number(draft.low) };
      return editing
        ? call(api.PUT("/items/{id}", { params: { path: { id: editing.id } }, body }))
        : call(api.POST("/items", { body }));
    },
    onSuccess: () => { setEditing(null); setDraft(EMPTY); qc.invalidateQueries({ queryKey: ["items"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => call(api.DELETE("/items/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  function edit(i: Item) {
    setEditing(i);
    setDraft({ sku: i.sku, name: i.name, unit: i.unit, barcode: i.barcode ?? "", low: i.lowStockThreshold == null ? "" : String(i.lowStockThreshold) });
  }
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setDraft((d) => ({ ...d, [k]: v })); // functional update: never overwrite a concurrent edit with a stale copy
  };
  const write = can("inventory.write");

  return (
    <>
      <h1>{t("items.title")}</h1>
      {write && (
        <form className="card grid" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
          <h2>{editing ? t("items.edit") : t("items.new")}</h2>
          <Field label={t("items.sku")}><input value={draft.sku} onChange={set("sku")} required maxLength={64} /></Field>
          <Field label={t("common.name")}><input value={draft.name} onChange={set("name")} required maxLength={200} /></Field>
          <Field label={t("items.unit")}><input value={draft.unit} onChange={set("unit")} required maxLength={16} /></Field>
          <Field label={t("items.barcode")}><input value={draft.barcode} onChange={set("barcode")} maxLength={64} /></Field>
          <Field label={t("items.lowStock")} hint={t("items.lowStockHint")}>
            <input type="number" min="0" step="0.001" inputMode="decimal" value={draft.low} onChange={set("low")} />
          </Field>
          <ErrorNote error={save.error} />
          <div className="row">
            <button type="submit" disabled={save.isPending}>{t("common.save")}</button>
            {editing && <button type="button" className="ghost" onClick={() => { setEditing(null); setDraft(EMPTY); }}>{t("common.cancel")}</button>}
          </div>
        </form>
      )}
      <ErrorNote error={list.error ?? remove.error} />
      {list.isPending ? <p>{t("common.loading")}</p> : list.data?.length === 0 ? <p className="muted">{t("common.empty")}</p> : (
        <div className="scroll"><table>
          <thead><tr><th>{t("items.sku")}</th><th>{t("common.name")}</th><th>{t("items.unit")}</th><th>{t("items.lowStock")}</th>{write && <th>{t("common.actions")}</th>}</tr></thead>
          <tbody>{list.data?.map((i) => (
            <tr key={i.id}>
              <td>{i.sku}</td><td>{i.name}</td><td>{i.unit}</td><td>{num(i.lowStockThreshold)}</td>
              {write && <td className="row">
                <button className="ghost" onClick={() => edit(i)}>{t("common.edit")}</button>
                <button className="ghost danger" onClick={() => window.confirm(t("common.confirmDelete", { name: i.name })) && remove.mutate(i.id)}>{t("common.delete")}</button>
              </td>}
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
