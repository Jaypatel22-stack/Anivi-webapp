import BrandMark from "../../components/BrandMark.js";
import { loginAction } from "../actions.js";

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const error = sp?.error;
  const next = sp?.next || "/dashboard";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <BrandMark />
          Anvil
        </div>
        <p className="sub">Sign in to your shop&apos;s workspace</p>
        {error ? <div className="callout">{error}</div> : null}
        <form action={loginAction}>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn primary" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
