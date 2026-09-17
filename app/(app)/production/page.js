import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../lib/require-session.js";
import { db } from "../../../db/client.js";
import { workOrders } from "../../../db/schema.js";

const STATUSES = [["queued", "Queued"], ["running", "Running"], ["blocked", "Blocked"], ["done", "Done"]];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function ProductionPage() {
  const session = await requireSession();
  const all = await db.select().from(workOrders).where(eq(workOrders.orgId, session.orgId));

  return (
    <div className="view">
      <div className="panel-head">
        <div>
          <h2>Production</h2>
          <p>Work orders move left to right. Click a card for details.</p>
        </div>
        <Link href="/production/new" className="btn primary">+ New work order</Link>
      </div>
      <div className="board">
        {STATUSES.map(([key, label]) => {
          const jobs = all.filter((w) => w.status === key).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          return (
            <div className="col" key={key}>
              <div className="col-head">
                <span className="name">{label}</span>
                <span className="count">{jobs.length}</span>
              </div>
              {jobs.length ? (
                jobs.map((w) => {
                  const late = w.status !== "done" && w.dueDate < today();
                  return (
                    <Link href={`/production/${w.id}`} className="job" key={w.id}>
                      <div className="wo-no">{w.woNo}</div>
                      <div className="part">{w.productName}</div>
                      <div className="row"><span>Qty {w.qty}</span><span>{w.machine || "—"}</span></div>
                      <div className="row">
                        <span className={late ? "flag" : ""}>{late ? "Late · " : ""}Due {fmtDate(w.dueDate)}</span>
                        {w.hasOpenNcr ? <span className="flag">NCR</span> : null}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="empty-col">No jobs</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
