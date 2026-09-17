import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../../lib/require-session.js";
import { db } from "../../../../../db/client.js";
import { inventoryItems } from "../../../../../db/schema.js";
import { createPurchaseOrderAction } from "../../../../actions.js";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function NewPurchaseOrderPage() {
  const session = await requireSession();
  const rawItems = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.type, "raw")));

  if (!rawItems.length) {
    return (
      <div className="view">
        <div className="callout">
          No raw material items yet. <Link href="/inventory/stock/new">Add one</Link> first.
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="panel-head"><div><h2>New purchase order</h2></div></div>
      <form action={createPurchaseOrderAction} className="form-card">
        <div className="field">
          <label htmlFor="supplier">Supplier</label>
          <input id="supplier" name="supplier" required />
        </div>
        <div className="field">
          <label htmlFor="sku">Item</label>
          <select id="sku" name="sku" required defaultValue={rawItems[0].sku}>
            {rawItems.map((r) => <option key={r.sku} value={r.sku}>{r.name} ({r.sku})</option>)}
          </select>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="qty">Quantity</label>
            <input id="qty" name="qty" type="number" min="1" defaultValue={100} required />
          </div>
          <div className="field">
            <label htmlFor="unitCost">Unit cost ($)</label>
            <input id="unitCost" name="unitCost" type="number" min="0" step="0.01" defaultValue={0} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="expectedDate">Expected date</label>
          <input id="expectedDate" name="expectedDate" type="date" defaultValue={addDays(7)} />
        </div>
        <div className="form-actions">
          <Link href="/inventory/purchase-orders" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Create PO</button>
        </div>
      </form>
    </div>
  );
}
