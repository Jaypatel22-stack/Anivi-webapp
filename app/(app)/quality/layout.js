import Link from "next/link";
import { headers } from "next/headers";

const SUBNAV = [
  { href: "/quality/ncrs", label: "Non-Conformances" },
  { href: "/quality/capas", label: "CAPA" },
];

export default async function QualityLayout({ children }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  return (
    <>
      <div id="subbar">
        {SUBNAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`subtab${pathname.startsWith(item.href) ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
