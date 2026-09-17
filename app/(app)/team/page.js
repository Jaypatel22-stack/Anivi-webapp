import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireAdmin } from "../../../lib/require-session.js";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";

export default async function TeamPage() {
  const session = await requireAdmin();
  const rows = await db.select().from(users).where(eq(users.orgId, session.orgId));

  return (
    <div className="view">
      <div className="panel-head">
        <div><h2>Team</h2><p>Everyone with access to this workspace.</p></div>
        <Link href="/team/new" className="btn primary">+ Add teammate</Link>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}{u.id === session.userId ? " (you)" : ""}</td>
                  <td>{u.email}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12.5, maxWidth: 520 }}>
        There is no self-serve password reset yet — if someone forgets theirs, an admin needs to create a fresh account for them or run a script against the database.
      </p>
    </div>
  );
}
