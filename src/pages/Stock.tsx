import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, call } from "../api";
import type { components } from "../api-types";
import { useAuth } from "../auth";
import { ErrorNote, Field, useNumber } from "../components/ui";

type Reason = components["schemas"]["Reason"];
const REASONS: Reason[] = ["RECEIVE", "SALE", "WASTE", "ADJUST"];

export default function Stock() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const num = useNumber();
  const qc = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState<Reason>("RECEIVE");
  const [qty, setQty] = useState("");
  const [done, setDone] = useState<number | null>(null);

  // One key per intended change. Reused on retry (network error, double click) so the server applies it once;
  // replaced after success or when the user edits the form (a new intent).
  const key = useRef(crypto.randomUUID());
  const edit = <T,>(set: (v: T) => void) => (v: T) => { key.current = crypto.randomUUID(); setDone(null); set(v); };

  const items = useQuery({ queryKey: ["items"], queryFn: () => call(api.GET("/items", { params: { query: { limit: 500 } } })) });
  const locations = useQuery({ queryKey: ["locations"], queryFn: () => call(api.GET("/locations")) });
  const levels = useQuery({ queryKey: ["levels"], queryFn: () => call(api.GET("/stock")) });
  const history = useQuery({ queryKey: ["movements"], queryFn: () => call(api.GET("/stock/movements", { params: { query: { limit: 50 } } })) });

  const move = useMutation({
    mutationFn: () => {
      const q = Number(qty);
      const delta = reason === "RECEIVE" ? Math.abs(q) : reason === "ADJUST" ? q : -Math.abs(q);
      return call(api.POST("/stock/movements", { params: { header: { "Idempotency-Key": key.current } }, body: { itemId, locationId, delta, reason } }));
    },
    onSuccess: (m) => {
      key.current = crypto.randomUUID();
      setQty("");
      setDone(m.qtyAfter);
      qc.invalidateQueries({ queryKey: ["levels"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
    },
  });

  const itemById = new Map(items.data?.map((i) => [i.id, i]));
  const locName = new Map(locations.data?.map((l) => [l.id, l.name]));
  const write = can("inventory.write");

  return (
    <>
      <h1>{t("stock.title")}</h1>
      {write && (
        <form className="card grid" onSubmit={(e: FormEvent) => { e.preventDefault(); move.mutate(); }}>
          <h2>{t("stock.move")}</h2>
          <Field label={t("stock.item")}>
            <select value={itemId} onChange={(e) => edit(setItemId)(e.target.value)} required>
              <option value="">{t("stock.choose")}</option>
              {items.data?.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
            </select>
          </Field>
          <Field label={t("stock.location")}>
            <select value={locationId} onChange={(e) => edit(setLocationId)(e.target.value)} required>
              <option value="">{t("stock.choose")}</option>
              {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label={t("stock.reason")}>
            <select value={reason} onChange={(e) => edit(setReason)(e.target.value as Reason)}>
              {REASONS.map((r) => <option key={r} value={r}>{t(`stock.reasons.${r}`)}</option>)}
            </select>
          </Field>
          <Field label={t("stock.quantity")} hint={reason === "ADJUST" ? t("stock.quantityAdjustHint") : undefined}>
            <input type="number" step="0.001" inputMode="decimal" value={qty} onChange={(e) => edit(setQty)(e.target.value)} required />
          </Field>
          <ErrorNote error={move.error} />
          {done !== null && <p role="status" className="note ok">{t("stock.success", { qty: num(done) })}</p>}
          <button type="submit" disabled={move.isPending || qty === "" || Number(qty) === 0}>{t("stock.submit")}</button>
        </form>
      )}

      <h2>{t("stock.levels")}</h2>
      <ErrorNote error={levels.error ?? items.error} />
      {levels.isPending ? <p>{t("common.loading")}</p> : levels.data?.length === 0 ? <p className="muted">{t("common.empty")}</p> : (
        <div className="scroll"><table>
          <thead><tr><th>{t("stock.item")}</th><th>{t("stock.location")}</th><th className="num">{t("stock.qty")}</th></tr></thead>
          <tbody>{levels.data?.map((l) => {
            const it = itemById.get(l.itemId);
            const low = it?.lowStockThreshold != null && l.qty <= it.lowStockThreshold;
            return (
              <tr key={l.itemId + l.locationId}>
                <td>{it?.name ?? l.itemId}</td><td>{locName.get(l.locationId) ?? l.locationId}</td>
                <td className="num">{num(l.qty)} {it?.unit} {low && <span className="badge">{t("stock.low")}</span>}</td>
              </tr>);
          })}</tbody>
        </table></div>
      )}

      <h2>{t("stock.history")}</h2>
      {history.data && history.data.length > 0 && (
        <div className="scroll"><table>
          <thead><tr><th>{t("stock.when")}</th><th>{t("stock.item")}</th><th>{t("stock.location")}</th><th>{t("stock.reason")}</th><th className="num">{t("stock.change")}</th><th className="num">{t("stock.after")}</th></tr></thead>
          <tbody>{history.data.map((m) => (
            <tr key={m.seq}>
              <td>{new Date(m.createdAt).toLocaleString(i18n.language)}</td>
              <td>{itemById.get(m.itemId)?.name ?? m.itemId}</td><td>{locName.get(m.locationId) ?? m.locationId}</td>
              <td>{t(`stock.reasonShort.${m.reason}`)}</td>
              <td className="num">{m.delta > 0 ? "+" : ""}{num(m.delta)}</td><td className="num">{num(m.qtyAfter)}</td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
