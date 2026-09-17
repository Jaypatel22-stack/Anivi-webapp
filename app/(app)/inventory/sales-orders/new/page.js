import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../../lib/require-session.js";
import { db } from "../../../../../db/client.js";
import { inventoryItems } from "../../../../../db/schema.js";
import { createSalesOrderAction } from "../../../../actions.js";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function NewSalesOrderPage() {
  const session = await requireSession();
  const finishedGoods = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.type, "finished")));

  if (!finishedGoods.length) {
    return (
      <div className="view">
        <div className="callout">
          No finished-good items yet. <Link href="/inventory/stock/new">Add one</Link> first.
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="panel-head"><div><h2>New sales order</h2></div></div>
      <form action={createSalesOrderAction} className="form-card">
        <div className="field">
          <label htmlFor="customer">Customer</label>
          <input id="customer" name="customer" required />
        </div>
        <div className="field">
          <label htmlFor="sku">Item</label>
          <select id="sku" name="sku" required defaultValue={finishedGoods[0].sku}>
            {finishedGoods.map((f) => <option key={f.sku} value={f.sku}>{f.name} ({f.sku})</option>)}
          </select>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="qty">Quantity</label>
            <input id="qty" name="qty" type="number" min="1" defaultValue={10} required />
          </div>
          <div className="field">
            <label htmlFor="shipDate">Ship date</label>
            <input id="shipDate" name="shipDate" type="date" defaultValue={addDays(7)} />
          </div>
        </div>
        <div className="form-actions">
          <Link href="/inventory/sales-orders" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Create SO</button>
        </div>
      </form>
    </div>
  );
}
