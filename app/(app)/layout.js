import { eq } from "drizzle-orm";
import Link from "next/link";
import { headers } from "next/headers";
import BrandMark from "../../components/BrandMark.js";
import { requireSession } from "../../lib/require-session.js";
import { logoutAction } from "../actions.js";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema.js";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/production", label: "Production" },
  { href: "/inventory", label: "Inventory & Orders" },
  { href: "/quality", label: "Quality" },
];

export default async function AppLayout({ children }) {
  const session = await requireSession();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, session.orgId));

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  return (
    <div id="shell">
      <div id="topbar">
        <Link href="/dashboard" className="brand">
          <BrandMark />
          Anvil
        </Link>
        <div id="tabs">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`tab${pathname.startsWith(item.href) ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div id="orgbar">
          <span>{org?.name}</span>
          <span>·</span>
          <span>{session.name}{session.role === "admin" ? " (admin)" : ""}</span>
          {session.role === "admin" ? <Link href="/team" className="tab" style={{ padding: "4px 8px" }}>Team</Link> : null}
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
