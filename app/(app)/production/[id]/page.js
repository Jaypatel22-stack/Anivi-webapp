import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { workOrders, boms, inventoryItems } from "../../../../db/schema.js";
import { updateWorkOrderAction } from "../../../actions.js";

const STATUSES = [["queued", "Queued"], ["running", "Running"], ["blocked", "Blocked"], ["done", "Done"]];

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function WorkOrderDetailPage({ params }) {
  const { id } = await params;
  const session = await requireSession();

  const [wo] = await db.select().from(workOrders).where(and(eq(workOrders.orgId, session.orgId), eq(workOrders.id, id)));
  if (!wo) notFound();

  const [bom] = await db.select().from(boms).where(and(eq(boms.orgId, session.orgId), eq(boms.sku, wo.sku)));
  const components = [];
  if (bom) {
    for (const c of bom.components) {
      const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, c.sku)));
      const need = Number(c.qty) * Number(wo.qty);
      components.push({ name: item ? item.name : c.sku, need, have: item ? Number(item.qtyOnHand) : null });
    }
  }

  return (
    <div className="view">
      <div className="panel-head"><div><h2>{wo.woNo}</h2><p>{wo.productName}</p></div></div>

      <div className="card card-pad" style={{ maxWidth: 560 }}>
        <div className="detail-grid">
          <div><div className="k">Product</div>{wo.productName}</div>
          <div><div className="k">Status</div><span className={`pill ${wo.status}`}>{wo.status}</span></div>
          <div><div className="k">Quantity</div>{wo.qty} (scrap {wo.scrapQty || 0})</div>
          <div><div className="k">Due</div>{fmtDate(wo.dueDate)}</div>
          <div><div className="k">Machine</div>{wo.machine || "—"}</div>
          <div><div className="k">Operator</div>{wo.operator || "—"}</div>
        </div>

        {wo.notes ? (
          <>
            <div className="divider" />
            <div><div className="k">Notes</div>{wo.notes}</div>
          </>
        ) : null}

        <div className="divider" />
        <div style={{ marginBottom: 16 }}>
          <div className="k" style={{ marginBottom: 6 }}>Components required</div>
          {components.length ? (
            components.map((c, i) => (
              <div className="list-row" key={i}>
                <div className="main">
                  <div className="title">{c.name}</div>
                  <div className="meta">needs {c.need} · {c.have ?? "?"} in stock</div>
                </div>
                <span className={`pill ${c.have !== null && c.have < c.need ? "low" : "ok-stock"}`}>
                  {c.have !== null && c.have < c.need ? "short" : "ok"}
                </span>
              </div>
            ))
          ) : (
            <div className="empty">No BOM defined for this item.</div>
          )}
        </div>

        <div className="divider" />
        <form action={updateWorkOrderAction}>
          <input type="hidden" name="id" value={wo.id} />
          <div className="field">
            <label htmlFor="status">Move to status</label>
            <select id="status" name="status" defaultValue={wo.status}>
              {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="scrapQty">Scrap qty</label>
              <input id="scrapQty" name="scrapQty" type="number" min="0" defaultValue={wo.scrapQty || 0} />
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <Link href={`/quality/ncrs/new?workOrderId=${wo.id}`} className="btn danger small">Raise NCR</Link>
            </div>
          </div>
          <div className="form-actions">
            <Link href="/production" className="btn">Back</Link>
            <button type="submit" className="btn primary">Update work order</button>
          </div>
        </form>
      </div>
    </div>
  );
}
