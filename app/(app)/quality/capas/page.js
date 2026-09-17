import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { capas } from "../../../../db/schema.js";
import { advanceCapaAction } from "../../../actions.js";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function CapasPage() {
  const session = await requireSession();
  const rows = (await db.select().from(capas).where(eq(capas.orgId, session.orgId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>CAPA</h2><p>Corrective &amp; preventive actions, tracked to closure.</p></div>
        <Link href="/quality/capas/new" className="btn primary">+ New CAPA</Link>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>CAPA #</th><th>Linked NCR</th><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.capaNo}</td>
                  <td>{c.ncrNo || "—"}</td>
                  <td style={{ maxWidth: 280 }}>{c.action}</td>
                  <td>{c.owner || "—"}</td>
                  <td>{fmtDate(c.dueDate)}</td>
                  <td><span className={`pill ${c.status === "closed" ? "closed" : c.status === "in-progress" ? "progress" : "open"}`}>{c.status}</span></td>
                  <td className="actions">
                    {c.status !== "closed" ? (
                      <form action={advanceCapaAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn small">{c.status === "open" ? "Start" : "Close"}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}><div className="empty">No CAPAs yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
