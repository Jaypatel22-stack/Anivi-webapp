import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../lib/require-session.js";
import { db } from "../../../db/client.js";
import { workOrders, inventoryItems, ncrs, capas } from "../../../db/schema.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const session = await requireSession();

  const allWos = await db.select().from(workOrders).where(eq(workOrders.orgId, session.orgId));
  const allInventory = await db.select().from(inventoryItems).where(eq(inventoryItems.orgId, session.orgId));
  const allNcrs = await db.select().from(ncrs).where(eq(ncrs.orgId, session.orgId));
  const allCapas = await db.select().from(capas).where(eq(capas.orgId, session.orgId));

  const openWos = allWos.filter((w) => w.status !== "done");
  const lateWos = openWos.filter((w) => w.dueDate < today());
  const lowStock = allInventory.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderPoint));
  const openNcrs = allNcrs.filter((n) => n.status === "open");
  const openCapas = allCapas.filter((c) => c.status !== "closed");

  const attention = [
    ...lateWos.map((w) => ({ key: `wo-${w.id}`, title: `${w.woNo} — ${w.productName}`, meta: `Due ${fmtDate(w.dueDate)} · past due`, pill: "blocked", pillLabel: "Late" })),
    ...lowStock.map((i) => ({ key: `inv-${i.id}`, title: i.name, meta: `${i.qtyOnHand} on hand · reorder at ${i.reorderPoint}`, pill: "low", pillLabel: "Low stock" })),
    ...openNcrs.map((n) => ({ key: `ncr-${n.id}`, title: `${n.ncrNo} — ${n.woNo || "—"}`, meta: n.description.slice(0, 60) + (n.description.length > 60 ? "…" : ""), pill: "open", pillLabel: "NCR open" })),
  ];

  const upcoming = openWos.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);

  return (
    <div className="view">
      <div className="panel-head">
        <div>
          <h2>Shop overview</h2>
          <p>Production, inventory, and quality — one shared record.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="label">Open work orders</div>
          <div className="value">{openWos.length}</div>
          <div className="sub">{allWos.length} total</div>
        </div>
        <div className="kpi">
          <div className="label">Late jobs</div>
          <div className={`value ${lateWos.length ? "crit" : "ok"}`}>{lateWos.length}</div>
          <div className="sub">past due date</div>
        </div>
        <div className="kpi">
          <div className="label">Low stock items</div>
          <div className={`value ${lowStock.length ? "warn" : "ok"}`}>{lowStock.length}</div>
          <div className="sub">at or below reorder point</div>
        </div>
        <div className="kpi">
          <div className="label">Open NCRs</div>
          <div className={`value ${openNcrs.length ? "crit" : "ok"}`}>{openNcrs.length}</div>
          <div className="sub">{openCapas.length} open CAPAs</div>
        </div>
      </div>

      <div className="two-col-grid">
        <div className="card card-pad">
          <h3>Attention needed</h3>
          {attention.length ? (
            attention.map((a) => (
              <div className="list-row" key={a.key}>
                <div className="main">
                  <div className="title">{a.title}</div>
                  <div className="meta">{a.meta}</div>
                </div>
                <span className={`pill ${a.pill}`}>{a.pillLabel}</span>
              </div>
            ))
          ) : (
            <div className="empty">Nothing needs attention right now.</div>
          )}
        </div>
        <div className="card card-pad">
          <h3>Jobs due soon</h3>
          {upcoming.length ? (
            upcoming.map((w) => (
              <Link href={`/production/${w.id}`} className="list-row" key={w.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="main">
                  <div className="title">{w.woNo} — {w.productName}</div>
                  <div className="meta">Qty {w.qty} · {w.machine || "unassigned"}</div>
                </div>
                <span className={`pill ${w.status}`}>{w.status}</span>
              </Link>
            ))
          ) : (
            <div className="empty">No open work orders.</div>
          )}
        </div>
      </div>
    </div>
  );
}
