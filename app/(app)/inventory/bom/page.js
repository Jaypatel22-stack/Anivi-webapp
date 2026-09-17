import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { inventoryItems, boms } from "../../../../db/schema.js";

export default async function BomPage() {
  const session = await requireSession();
  const finished = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.type, "finished")));
  const allBoms = await db.select().from(boms).where(eq(boms.orgId, session.orgId));
  const allItems = await db.select().from(inventoryItems).where(eq(inventoryItems.orgId, session.orgId));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>Bill of materials</h2><p>What each finished good consumes when produced.</p></div>
      </div>
      {finished.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {finished.map((f) => {
            const bom = allBoms.find((b) => b.sku === f.sku);
            return (
              <div className="card card-pad" key={f.sku}>
                <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span>{f.name} <span className="mono" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{f.sku}</span></span>
                  <Link href={`/inventory/bom/${f.sku}`} className="btn small">Edit</Link>
                </h3>
                {bom && bom.components.length ? (
                  bom.components.map((c, i) => {
                    const item = allItems.find((it) => it.sku === c.sku);
                    return (
                      <div className="list-row" key={i}>
                        <div className="main"><div className="title">{item ? item.name : c.sku}</div></div>
                        <span className="mono" style={{ color: "var(--muted)", fontSize: 12.5 }}>{c.qty} / unit</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty">No components defined yet.</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">Add a finished good item first.</div>
      )}
    </div>
  );
}
