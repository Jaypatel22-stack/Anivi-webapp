import Link from "next/link";
import { headers } from "next/headers";

const SUBNAV = [
  { href: "/inventory/stock", label: "Stock" },
  { href: "/inventory/bom", label: "Bill of Materials" },
  { href: "/inventory/purchase-orders", label: "Purchase Orders" },
  { href: "/inventory/sales-orders", label: "Sales Orders" },
];

export default async function InventoryLayout({ children }) {
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
