import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { inventoryItems } from "../../../../db/schema.js";

function money(n) {
  return "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function StockPage() {
  const session = await requireSession();
  const items = (await db.select().from(inventoryItems).where(eq(inventoryItems.orgId, session.orgId)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>Stock</h2><p>Raw materials and finished goods on hand.</p></div>
        <Link href="/inventory/stock/new" className="btn primary">+ New item</Link>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Item</th><th>Type</th><th>Location</th><th className="num">On hand</th><th className="num">Reorder at</th><th className="num">Unit cost</th><th>Status</th></tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low = Number(i.qtyOnHand) <= Number(i.reorderPoint);
                return (
                  <tr key={i.id}>
                    <td><strong>{i.name}</strong><br /><span className="mono" style={{ color: "var(--muted)", fontSize: 11.5 }}>{i.sku}</span></td>
                    <td style={{ textTransform: "capitalize" }}>{i.type}</td>
                    <td>{i.location || "—"}</td>
                    <td className="num">{i.qtyOnHand}</td>
                    <td className="num">{i.reorderPoint}</td>
                    <td className="num">{money(i.unitCost)}</td>
                    <td>{low ? <span className="pill low">Low</span> : <span className="pill ok-stock">OK</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
