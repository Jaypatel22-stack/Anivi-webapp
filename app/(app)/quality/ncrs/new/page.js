import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "../../../../../lib/require-session.js";
import { db } from "../../../../../db/client.js";
import { workOrders } from "../../../../../db/schema.js";
import { createNcrAction } from "../../../../actions.js";

export default async function NewNcrPage({ searchParams }) {
  const sp = await searchParams;
  const preselectedWorkOrderId = sp?.workOrderId || "";
  const session = await requireSession();
  const wos = await db.select().from(workOrders).where(eq(workOrders.orgId, session.orgId));

  return (
    <div className="view">
      <div className="panel-head"><div><h2>New non-conformance</h2></div></div>
      <form action={createNcrAction} className="form-card">
        <div className="field">
          <label htmlFor="workOrderId">Work order</label>
          <select id="workOrderId" name="workOrderId" defaultValue={preselectedWorkOrderId}>
            <option value="">— none —</option>
            {wos.map((w) => <option key={w.id} value={w.id}>{w.woNo} — {w.productName}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" required placeholder="What's out of spec?" />
        </div>
        <div className="field">
          <label htmlFor="disposition">Disposition</label>
          <select id="disposition" name="disposition" defaultValue="pending">
            <option value="pending">Pending review</option>
            <option value="use-as-is">Use as-is</option>
            <option value="rework">Rework</option>
            <option value="scrap">Scrap</option>
          </select>
        </div>
        <div className="form-actions">
          <Link href="/quality/ncrs" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Log NCR</button>
        </div>
      </form>
    </div>
  );
}
