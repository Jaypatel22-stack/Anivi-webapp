import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { salesOrders } from "../../../../db/schema.js";
import { shipSalesOrderAction } from "../../../actions.js";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function SalesOrdersPage({ searchParams }) {
  const sp = await searchParams;
  const error = sp?.error;
  const session = await requireSession();
  const rows = (await db.select().from(salesOrders).where(eq(salesOrders.orgId, session.orgId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>Sales orders</h2><p>Customer orders reserving finished goods.</p></div>
        <Link href="/inventory/sales-orders/new" className="btn primary">+ New sales order</Link>
      </div>
      {error ? <div className="callout">{error}</div> : null}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>SO #</th><th>Customer</th><th>Item</th><th className="num">Qty</th><th>Ship date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.soNo}</td>
                  <td>{s.customer}</td>
                  <td>{s.itemName}</td>
                  <td className="num">{s.qty}</td>
                  <td>{fmtDate(s.shipDate)}</td>
                  <td><span className={`pill ${s.status}`}>{s.status}</span></td>
                  <td className="actions">
                    {s.status !== "shipped" ? (
                      <form action={shipSalesOrderAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="btn small">Mark shipped</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}><div className="empty">No sales orders yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
