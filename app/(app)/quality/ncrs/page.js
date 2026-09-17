import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../lib/require-session.js";
import { db } from "../../../../db/client.js";
import { ncrs } from "../../../../db/schema.js";
import { closeNcrAction } from "../../../actions.js";

export default async function NcrsPage() {
  const session = await requireSession();
  const rows = (await db.select().from(ncrs).where(eq(ncrs.orgId, session.orgId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>Non-conformances</h2><p>Defects and deviations, with disposition.</p></div>
        <Link href="/quality/ncrs/new" className="btn primary">+ New NCR</Link>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>NCR #</th><th>Work order</th><th>Description</th><th>Disposition</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((n) => (
                <tr key={n.id}>
                  <td className="mono">{n.ncrNo}</td>
                  <td>{n.woNo || "—"}</td>
                  <td style={{ maxWidth: 320 }}>{n.description}</td>
                  <td style={{ textTransform: "capitalize" }}>{n.disposition}</td>
                  <td><span className={`pill ${n.status}`}>{n.status}</span></td>
                  <td className="actions">
                    {n.status === "open" ? (
                      <form action={closeNcrAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <button type="submit" className="btn small">Close</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}><div className="empty">No non-conformances logged.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
