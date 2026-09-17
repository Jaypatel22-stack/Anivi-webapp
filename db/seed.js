import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "./client.js";
import { organizations, users, inventoryItems, boms, workOrders, purchaseOrders, salesOrders, ncrs, capas } from "./schema.js";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const orgName = process.env.ORG_NAME || "Demo Manufacturing Co.";
  const orgSlug = process.env.ORG_SLUG || "demo-mfg";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminName = process.env.ADMIN_NAME || "Admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe!123";

  const existing = await db.select().from(organizations).where(eq(organizations.slug, orgSlug));
  if (existing.length) {
    console.log(`Organization "${orgSlug}" already exists — skipping seed. Delete it manually first if you want to reseed.`);
    await pool.end();
    return;
  }

  const [org] = await db.insert(organizations).values({ name: orgName, slug: orgSlug }).returning();
  console.log(`Created organization: ${org.name} (${org.id})`);

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const [admin] = await db.insert(users).values({
    orgId: org.id, email: adminEmail, passwordHash, name: adminName, role: "admin",
  }).returning();
  console.log(`Created admin user: ${admin.email}`);

  const inv = await db.insert(inventoryItems).values([
    { orgId: org.id, sku: "steel-plate-3mm", name: "Steel Plate 3mm", type: "raw", qtyOnHand: 420, reorderPoint: 150, unitCost: 4.20, location: "Rack A2" },
    { orgId: org.id, sku: "bracket-hinge", name: "Hinge Bracket", type: "raw", qtyOnHand: 88, reorderPoint: 100, unitCost: 1.85, location: "Bin 14" },
    { orgId: org.id, sku: "weld-wire-08", name: 'Weld Wire .08"', type: "raw", qtyOnHand: 36, reorderPoint: 40, unitCost: 22.00, location: "Cage 3" },
    { orgId: org.id, sku: "powder-coat-blk", name: "Powder Coat — Black", type: "raw", qtyOnHand: 210, reorderPoint: 60, unitCost: 0.65, location: "Coat Room" },
    { orgId: org.id, sku: "panel-assy-24", name: 'Panel Assembly 24"', type: "finished", qtyOnHand: 54, reorderPoint: 20, unitCost: 38.10, location: "FG Shelf 1" },
    { orgId: org.id, sku: "bracket-kit-a", name: "Bracket Kit A", type: "finished", qtyOnHand: 12, reorderPoint: 25, unitCost: 14.75, location: "FG Shelf 2" },
  ]).returning();
  console.log(`Seeded ${inv.length} inventory items`);

  await db.insert(boms).values([
    { orgId: org.id, sku: "panel-assy-24", components: [{ sku: "steel-plate-3mm", qty: 2 }, { sku: "weld-wire-08", qty: 0.5 }, { sku: "powder-coat-blk", qty: 3 }] },
    { orgId: org.id, sku: "bracket-kit-a", components: [{ sku: "bracket-hinge", qty: 4 }, { sku: "powder-coat-blk", qty: 1 }] },
  ]);
  console.log("Seeded bills of materials");

  const insertedWos = await db.insert(workOrders).values([
    { orgId: org.id, woNo: "WO-1042", sku: "panel-assy-24", productName: 'Panel Assembly 24"', qty: 40, scrapQty: 1, status: "running", machine: "Laser 2", operator: "D. Ruiz", dueDate: addDays(2), notes: "Rush order for Meridian Fab.", hasOpenNcr: false },
    { orgId: org.id, woNo: "WO-1043", sku: "bracket-kit-a", productName: "Bracket Kit A", qty: 100, scrapQty: 0, status: "queued", machine: "Press 1", operator: "", dueDate: addDays(5), notes: "", hasOpenNcr: false },
    { orgId: org.id, woNo: "WO-1039", sku: "panel-assy-24", productName: 'Panel Assembly 24"', qty: 25, scrapQty: 3, status: "blocked", machine: "Weld Cell B", operator: "T. Okafor", dueDate: addDays(-1), notes: "Waiting on weld wire restock.", hasOpenNcr: true },
    { orgId: org.id, woNo: "WO-1030", sku: "bracket-kit-a", productName: "Bracket Kit A", qty: 60, scrapQty: 2, status: "done", machine: "Press 1", operator: "D. Ruiz", dueDate: addDays(-4), notes: "", hasOpenNcr: false },
  ]).returning();
  const wo1039 = insertedWos.find((w) => w.woNo === "WO-1039");
  console.log("Seeded work orders");

  await db.insert(purchaseOrders).values([
    { orgId: org.id, poNo: "PO-501", supplier: "Midwest Steel Supply", sku: "weld-wire-08", itemName: 'Weld Wire .08"', qty: 200, unitCost: 20.50, status: "draft", expectedDate: addDays(3) },
    { orgId: org.id, poNo: "PO-498", supplier: "Colonial Hardware", sku: "bracket-hinge", itemName: "Hinge Bracket", qty: 500, unitCost: 1.70, status: "draft", expectedDate: addDays(9) },
  ]);
  console.log("Seeded purchase orders");

  await db.insert(salesOrders).values([
    { orgId: org.id, soNo: "SO-330", customer: "Meridian Fabrication", sku: "panel-assy-24", itemName: 'Panel Assembly 24"', qty: 40, status: "open", shipDate: addDays(3) },
    { orgId: org.id, soNo: "SO-322", customer: "Coastal Rack & Rail", sku: "bracket-kit-a", itemName: "Bracket Kit A", qty: 60, status: "shipped", shipDate: addDays(-4) },
  ]);
  console.log("Seeded sales orders");

  const [ncr88] = await db.insert(ncrs).values([
    { orgId: org.id, ncrNo: "NCR-88", workOrderId: wo1039.id, woNo: wo1039.woNo, sku: wo1039.sku, description: "5 panels out of flatness tolerance after welding — bowing >1.5mm.", disposition: "rework", status: "open" },
  ]).returning();
  console.log("Seeded NCRs");

  await db.insert(capas).values([
    { orgId: org.id, capaNo: "CAPA-14", ncrId: ncr88.id, ncrNo: ncr88.ncrNo, action: "Add fixture clamp check to weld cell setup sheet.", owner: "T. Okafor", dueDate: addDays(6), status: "in-progress" },
  ]);
  console.log("Seeded CAPAs");

  console.log("\nDone. Sign in with:");
  console.log(`  URL:      http://localhost:3000/login`);
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("\n(Change this password after first login — see the Team page.)");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
