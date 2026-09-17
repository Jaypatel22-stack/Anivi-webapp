"use server";

import { eq, and, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../db/client.js";
import { users, inventoryItems, boms, workOrders, purchaseOrders, salesOrders, ncrs, capas } from "../db/schema.js";
import { hashPassword, verifyPassword, createSessionCookie, clearSessionCookie } from "../lib/auth.js";
import { requireSession, requireAdmin } from "../lib/require-session.js";

function addDaysIso(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function nextNumber(orgId, table, field, prefix) {
  const rows = await db.select().from(table).where(eq(table.orgId, orgId));
  const nums = rows
    .map((r) => parseInt(String(r[field] || "").replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `${prefix}-${next}`;
}

/* ============================== AUTH ============================== */

export async function loginAction(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const loginUrl = new URL("/login", "http://internal");
    loginUrl.searchParams.set("error", "Incorrect email or password.");
    if (next.startsWith("/")) loginUrl.searchParams.set("next", next);
    redirect(loginUrl.pathname + loginUrl.search);
  }

  await createSessionCookie(user);
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function createUserAction(formData) {
  const session = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = formData.get("role") === "admin" ? "admin" : "member";
  if (!email || !name || password.length < 8) {
    redirect("/team/new?error=" + encodeURIComponent("Name, a valid email, and an 8+ character password are required."));
  }
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) redirect("/team/new?error=" + encodeURIComponent("That email is already in use."));

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ orgId: session.orgId, email, name, passwordHash, role });
  revalidatePath("/team");
  redirect("/team");
}

/* ============================== PRODUCTION ============================== */

export async function createWorkOrderAction(formData) {
  const session = await requireSession();
  const sku = String(formData.get("sku") || "");
  const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, sku)));

  const woNo = await nextNumber(session.orgId, workOrders, "woNo", "WO");
  await db.insert(workOrders).values({
    orgId: session.orgId,
    woNo,
    sku,
    productName: item ? item.name : sku,
    qty: Number(formData.get("qty")) || 1,
    scrapQty: 0,
    status: "queued",
    machine: String(formData.get("machine") || ""),
    operator: String(formData.get("operator") || ""),
    dueDate: String(formData.get("dueDate") || addDaysIso(7)),
    notes: String(formData.get("notes") || ""),
    hasOpenNcr: false,
  });
  revalidatePath("/production");
  redirect("/production");
}

export async function updateWorkOrderAction(formData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const newStatus = String(formData.get("status") || "queued");
  const scrapQty = Number(formData.get("scrapQty")) || 0;

  const [wo] = await db.select().from(workOrders).where(and(eq(workOrders.orgId, session.orgId), eq(workOrders.id, id)));
  if (!wo) redirect("/production");

  const wasDone = wo.status === "done";
  await db.update(workOrders).set({ status: newStatus, scrapQty }).where(eq(workOrders.id, id));

  if (newStatus === "done" && !wasDone) {
    const good = Number(wo.qty) - Number(scrapQty);
    const [finishedGood] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, wo.sku)));
    if (finishedGood) {
      await db.update(inventoryItems).set({ qtyOnHand: Number(finishedGood.qtyOnHand) + good }).where(eq(inventoryItems.id, finishedGood.id));
    }
    const [bom] = await db.select().from(boms).where(and(eq(boms.orgId, session.orgId), eq(boms.sku, wo.sku)));
    if (bom) {
      for (const component of bom.components) {
        const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, component.sku)));
        if (item) {
          const nextQty = Math.max(0, Number(item.qtyOnHand) - Number(component.qty) * Number(wo.qty));
          await db.update(inventoryItems).set({ qtyOnHand: nextQty }).where(eq(inventoryItems.id, item.id));
        }
      }
    }
  }

  revalidatePath("/production");
  revalidatePath("/inventory/stock");
  revalidatePath(`/production/${id}`);
  redirect("/production");
}

/* ============================== INVENTORY: STOCK ============================== */

export async function createInventoryItemAction(formData) {
  const session = await requireSession();
  const sku = String(formData.get("sku") || "").trim();
  const [existing] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, sku)));
  if (existing) redirect("/inventory/stock/new?error=" + encodeURIComponent("SKU already exists."));

  await db.insert(inventoryItems).values({
    orgId: session.orgId,
    sku,
    name: String(formData.get("name") || ""),
    type: formData.get("type") === "finished" ? "finished" : "raw",
    qtyOnHand: Number(formData.get("qtyOnHand")) || 0,
    reorderPoint: Number(formData.get("reorderPoint")) || 0,
    unitCost: Number(formData.get("unitCost")) || 0,
    location: String(formData.get("location") || ""),
  });
  revalidatePath("/inventory/stock");
  redirect("/inventory/stock");
}

/* ============================== INVENTORY: BOM ============================== */

export async function saveBomAction(formData) {
  const session = await requireSession();
  const sku = String(formData.get("sku") || "");
  const componentSkus = formData.getAll("componentSku");
  const componentQtys = formData.getAll("componentQty");
  const components = componentSkus
    .map((s, i) => ({ sku: String(s), qty: Number(componentQtys[i]) || 0 }))
    .filter((c) => c.sku && c.qty > 0);

  const [existing] = await db.select().from(boms).where(and(eq(boms.orgId, session.orgId), eq(boms.sku, sku)));
  if (existing) {
    await db.update(boms).set({ components }).where(eq(boms.id, existing.id));
  } else {
    await db.insert(boms).values({ orgId: session.orgId, sku, components });
  }
  revalidatePath("/inventory/bom");
  redirect("/inventory/bom");
}

/* ============================== INVENTORY: PURCHASE ORDERS ============================== */

export async function createPurchaseOrderAction(formData) {
  const session = await requireSession();
  const sku = String(formData.get("sku") || "");
  const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, sku)));

  const poNo = await nextNumber(session.orgId, purchaseOrders, "poNo", "PO");
  await db.insert(purchaseOrders).values({
    orgId: session.orgId,
    poNo,
    supplier: String(formData.get("supplier") || ""),
    sku,
    itemName: item ? item.name : sku,
    qty: Number(formData.get("qty")) || 1,
    unitCost: Number(formData.get("unitCost")) || 0,
    status: "draft",
    expectedDate: String(formData.get("expectedDate") || addDaysIso(7)),
  });
  revalidatePath("/inventory/purchase-orders");
  redirect("/inventory/purchase-orders");
}

export async function receivePurchaseOrderAction(formData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.orgId, session.orgId), eq(purchaseOrders.id, id)));
  if (!po) redirect("/inventory/purchase-orders");

  await db.update(purchaseOrders).set({ status: "received" }).where(eq(purchaseOrders.id, id));
  const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, po.sku)));
  if (item) {
    await db.update(inventoryItems).set({ qtyOnHand: Number(item.qtyOnHand) + Number(po.qty) }).where(eq(inventoryItems.id, item.id));
  }
  revalidatePath("/inventory/purchase-orders");
  revalidatePath("/inventory/stock");
  redirect("/inventory/purchase-orders");
}

/* ============================== INVENTORY: SALES ORDERS ============================== */

export async function createSalesOrderAction(formData) {
  const session = await requireSession();
  const sku = String(formData.get("sku") || "");
  const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, sku)));

  const soNo = await nextNumber(session.orgId, salesOrders, "soNo", "SO");
  await db.insert(salesOrders).values({
    orgId: session.orgId,
    soNo,
    customer: String(formData.get("customer") || ""),
    sku,
    itemName: item ? item.name : sku,
    qty: Number(formData.get("qty")) || 1,
    status: "open",
    shipDate: String(formData.get("shipDate") || addDaysIso(7)),
  });
  revalidatePath("/inventory/sales-orders");
  redirect("/inventory/sales-orders");
}

export async function shipSalesOrderAction(formData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const [so] = await db.select().from(salesOrders).where(and(eq(salesOrders.orgId, session.orgId), eq(salesOrders.id, id)));
  if (!so) redirect("/inventory/sales-orders");

  const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.orgId, session.orgId), eq(inventoryItems.sku, so.sku)));
  if (item && Number(item.qtyOnHand) < Number(so.qty)) {
    const msg = `Not enough stock to ship ${so.soNo} (${item.qtyOnHand} on hand, ${so.qty} needed).`;
    redirect("/inventory/sales-orders?error=" + encodeURIComponent(msg));
  }
  await db.update(salesOrders).set({ status: "shipped" }).where(eq(salesOrders.id, id));
  if (item) {
    await db.update(inventoryItems).set({ qtyOnHand: Number(item.qtyOnHand) - Number(so.qty) }).where(eq(inventoryItems.id, item.id));
  }
  revalidatePath("/inventory/sales-orders");
  revalidatePath("/inventory/stock");
  redirect("/inventory/sales-orders");
}

/* ============================== QUALITY: NCR ============================== */

export async function createNcrAction(formData) {
  const session = await requireSession();
  const workOrderId = String(formData.get("workOrderId") || "");
  let woNo = "";
  let sku = "";
  if (workOrderId) {
    const [wo] = await db.select().from(workOrders).where(and(eq(workOrders.orgId, session.orgId), eq(workOrders.id, workOrderId)));
    if (wo) {
      woNo = wo.woNo;
      sku = wo.sku;
      await db.update(workOrders).set({ hasOpenNcr: true }).where(eq(workOrders.id, workOrderId));
    }
  }
  const ncrNo = await nextNumber(session.orgId, ncrs, "ncrNo", "NCR");
  await db.insert(ncrs).values({
    orgId: session.orgId,
    ncrNo,
    workOrderId: workOrderId || null,
    woNo,
    sku,
    description: String(formData.get("description") || ""),
    disposition: String(formData.get("disposition") || "pending"),
    status: "open",
  });
  revalidatePath("/quality/ncrs");
  revalidatePath("/production");
  redirect("/quality/ncrs");
}

export async function closeNcrAction(formData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const [ncr] = await db.select().from(ncrs).where(and(eq(ncrs.orgId, session.orgId), eq(ncrs.id, id)));
  if (!ncr) redirect("/quality/ncrs");

  await db.update(ncrs).set({ status: "closed" }).where(eq(ncrs.id, id));

  if (ncr.workOrderId) {
    const [stillOpen] = await db
      .select()
      .from(ncrs)
      .where(and(eq(ncrs.orgId, session.orgId), eq(ncrs.workOrderId, ncr.workOrderId), ne(ncrs.id, id), eq(ncrs.status, "open")));
    if (!stillOpen) {
      await db.update(workOrders).set({ hasOpenNcr: false }).where(eq(workOrders.id, ncr.workOrderId));
    }
  }
  revalidatePath("/quality/ncrs");
  revalidatePath("/production");
  redirect("/quality/ncrs");
}

/* ============================== QUALITY: CAPA ============================== */

export async function createCapaAction(formData) {
  const session = await requireSession();
  const ncrId = String(formData.get("ncrId") || "");
  let ncrNo = "";
  if (ncrId) {
    const [ncr] = await db.select().from(ncrs).where(and(eq(ncrs.orgId, session.orgId), eq(ncrs.id, ncrId)));
    if (ncr) ncrNo = ncr.ncrNo;
  }
  const capaNo = await nextNumber(session.orgId, capas, "capaNo", "CAPA");
  await db.insert(capas).values({
    orgId: session.orgId,
    capaNo,
    ncrId: ncrId || null,
    ncrNo,
    action: String(formData.get("action") || ""),
    owner: String(formData.get("owner") || ""),
    dueDate: String(formData.get("dueDate") || addDaysIso(10)),
    status: "open",
  });
  revalidatePath("/quality/capas");
  redirect("/quality/capas");
}

export async function advanceCapaAction(formData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const [capa] = await db.select().from(capas).where(and(eq(capas.orgId, session.orgId), eq(capas.id, id)));
  if (!capa) redirect("/quality/capas");
  const next = capa.status === "open" ? "in-progress" : "closed";
  await db.update(capas).set({ status: next }).where(eq(capas.id, id));
  revalidatePath("/quality/capas");
  redirect("/quality/capas");
}
