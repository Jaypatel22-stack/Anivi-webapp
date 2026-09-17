import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../../lib/require-session.js";
import { db } from "../../../../../db/client.js";
import { ncrs } from "../../../../../db/schema.js";
import { createCapaAction } from "../../../../actions.js";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function NewCapaPage() {
  const session = await requireSession();
  const allNcrs = await db.select().from(ncrs).where(eq(ncrs.orgId, session.orgId));

  return (
    <div className="view">
      <div className="panel-head"><div><h2>New CAPA</h2></div></div>
      <form action={createCapaAction} className="form-card">
        <div className="field">
          <label htmlFor="ncrId">Linked NCR</label>
          <select id="ncrId" name="ncrId" defaultValue="">
            <option value="">— none —</option>
            {allNcrs.map((n) => <option key={n.id} value={n.id}>{n.ncrNo}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="action">Corrective action</label>
          <textarea id="action" name="action" required placeholder="What will change to prevent recurrence?" />
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="owner">Owner</label>
            <input id="owner" name="owner" placeholder="Who's responsible" />
          </div>
          <div className="field">
            <label htmlFor="dueDate">Due date</label>
            <input id="dueDate" name="dueDate" type="date" defaultValue={addDays(10)} />
          </div>
        </div>
        <div className="form-actions">
          <Link href="/quality/capas" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Create CAPA</button>
        </div>
      </form>
    </div>
  );
}
