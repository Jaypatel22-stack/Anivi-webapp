import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { purchaseOrders } from "../../../../db/schema.js";
import { receivePurchaseOrderAction } from "../../../actions.js";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function PurchaseOrdersPage() {
  const session = await requireSession();
  const rows = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.orgId, session.orgId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>Purchase orders</h2><p>Restocking raw materials from suppliers.</p></div>
        <Link href="/inventory/purchase-orders/new" className="btn primary">+ New purchase order</Link>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>PO #</th><th>Supplier</th><th>Item</th><th className="num">Qty</th><th>Expected</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.poNo}</td>
                  <td>{p.supplier}</td>
                  <td>{p.itemName}</td>
                  <td className="num">{p.qty}</td>
                  <td>{fmtDate(p.expectedDate)}</td>
                  <td><span className={`pill ${p.status}`}>{p.status}</span></td>
                  <td className="actions">
                    {p.status !== "received" ? (
                      <form action={receivePurchaseOrderAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="btn small">Receive</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}><div className="empty">No purchase orders yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
