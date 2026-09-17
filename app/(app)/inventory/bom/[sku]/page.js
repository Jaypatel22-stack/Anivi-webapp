import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../../lib/require-session.js";
import { db } from "../../../../../db/client.js";
import { inventoryItems, boms } from "../../../../../db/schema.js";
import { saveBomAction } from "../../../../actions.js";

const MAX_ROWS = 8;

export default async function EditBomPage({ params }) {
  const { sku } = await params;
  const session = await requireSession();

  const [finishedGood] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, sku), eq(inventoryItems.type, "finished")));
  if (!finishedGood) notFound();

  const rawItems = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.type, "raw")));
  const [bom] = await db.select().from(boms).where(and(eq(boms.orgId, session.orgId), eq(boms.sku, sku)));
  const existing = bom ? bom.components : [];

  if (!rawItems.length) {
    return (
      <div className="view">
        <div className="callout">
          No raw material items yet. <Link href="/inventory/stock/new">Add one</Link> before defining a recipe.
        </div>
      </div>
    );
  }

  const rows = Array.from({ length: MAX_ROWS }, (_, i) => existing[i] || { sku: "", qty: "" });

  return (
    <div className="view">
      <div className="panel-head"><div><h2>Bill of materials — {finishedGood.name}</h2><p>Quantity of raw material needed to produce one unit.</p></div></div>
      <form action={saveBomAction} className="form-card" style={{ maxWidth: 460 }}>
        <input type="hidden" name="sku" value={sku} />
        {rows.map((row, i) => (
          <div className="bom-row" key={i}>
            <select name="componentSku" defaultValue={row.sku}>
              <option value="">— unused —</option>
              {rawItems.map((r) => <option key={r.sku} value={r.sku}>{r.name}</option>)}
            </select>
            <input name="componentQty" type="number" min="0" step="0.1" defaultValue={row.qty} placeholder="Qty" />
          </div>
        ))}
        <p className="hint" style={{ color: "var(--muted)", fontSize: 12.5 }}>Leave a row set to &ldquo;— unused —&rdquo; or 0 to skip it.</p>
        <div className="form-actions">
          <Link href="/inventory/bom" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Save BOM</button>
        </div>
      </form>
    </div>
  );
}
