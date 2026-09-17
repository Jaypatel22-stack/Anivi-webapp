import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { inventoryItems } from "../../../../db/schema.js";
import { createWorkOrderAction } from "../../../actions.js";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function NewWorkOrderPage() {
  const session = await requireSession();
  const finishedGoods = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.type, "finished")));

  if (!finishedGoods.length) {
    return (
      <div className="view">
        <div className="callout">
          No finished-good items yet. <Link href="/inventory/stock/new">Add one</Link> before creating a work order.
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="panel-head"><div><h2>New work order</h2></div></div>
      <form action={createWorkOrderAction} className="form-card">
        <div className="field">
          <label htmlFor="sku">Product</label>
          <select id="sku" name="sku" required defaultValue={finishedGoods[0].sku}>
            {finishedGoods.map((f) => (
              <option key={f.sku} value={f.sku}>{f.name} ({f.sku})</option>
            ))}
          </select>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="qty">Quantity</label>
            <input id="qty" name="qty" type="number" min="1" defaultValue={10} required />
          </div>
          <div className="field">
            <label htmlFor="dueDate">Due date</label>
            <input id="dueDate" name="dueDate" type="date" defaultValue={addDays(5)} required />
          </div>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="machine">Machine</label>
            <input id="machine" name="machine" placeholder="e.g. Press 1" />
          </div>
          <div className="field">
            <label htmlFor="operator">Operator</label>
            <input id="operator" name="operator" placeholder="Assign later" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" placeholder="Optional" />
        </div>
        <div className="form-actions">
          <Link href="/production" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Create work order</button>
        </div>
      </form>
    </div>
  );
}
