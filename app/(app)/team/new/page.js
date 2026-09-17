import Link from "next/link";
import { requireAdmin } from "../../../../lib/require-session.js";
import { createUserAction } from "../../../actions.js";

export default async function NewTeammatePage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const error = sp?.error;

  return (
    <div className="view">
      <div className="panel-head"><div><h2>Add a teammate</h2></div></div>
      {error ? <div className="callout">{error}</div> : null}
      <form action={createUserAction} className="form-card">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Temporary password</label>
          <input id="password" name="password" type="text" minLength={8} required />
          <span className="hint">Share this with them directly — there's no email invite flow yet.</span>
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-actions">
          <Link href="/team" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Add teammate</button>
        </div>
      </form>
    </div>
  );
}
