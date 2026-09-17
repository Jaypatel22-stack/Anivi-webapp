import {
  pgTable, uuid, text, doublePrecision, boolean, timestamp, date, jsonb, uniqueIndex,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
}));

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // "admin" | "member"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "raw" | "finished"
  qtyOnHand: doublePrecision("qty_on_hand").notNull().default(0),
  reorderPoint: doublePrecision("reorder_point").notNull().default(0),
  unitCost: doublePrecision("unit_cost").notNull().default(0),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgSkuIdx: uniqueIndex("inventory_org_sku_idx").on(t.orgId, t.sku),
}));

export const boms = pgTable("boms", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(), // finished-good sku this recipe belongs to
  components: jsonb("components").notNull().default([]), // [{sku, qty}]
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgSkuIdx: uniqueIndex("boms_org_sku_idx").on(t.orgId, t.sku),
}));

export const workOrders = pgTable("work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  woNo: text("wo_no").notNull(),
  sku: text("sku").notNull(),
  productName: text("product_name").notNull(),
  qty: doublePrecision("qty").notNull(),
  scrapQty: doublePrecision("scrap_qty").notNull().default(0),
  status: text("status").notNull().default("queued"), // queued | running | blocked | done
  machine: text("machine"),
  operator: text("operator"),
  dueDate: date("due_date").notNull(),
  notes: text("notes"),
  hasOpenNcr: boolean("has_open_ncr").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  poNo: text("po_no").notNull(),
  supplier: text("supplier").notNull(),
  sku: text("sku").notNull(),
  itemName: text("item_name").notNull(),
  qty: doublePrecision("qty").notNull(),
  unitCost: doublePrecision("unit_cost").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | received
  expectedDate: date("expected_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesOrders = pgTable("sales_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  soNo: text("so_no").notNull(),
  customer: text("customer").notNull(),
  sku: text("sku").notNull(),
  itemName: text("item_name").notNull(),
  qty: doublePrecision("qty").notNull(),
  status: text("status").notNull().default("open"), // open | shipped
  shipDate: date("ship_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ncrs = pgTable("ncrs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  ncrNo: text("ncr_no").notNull(),
  workOrderId: uuid("work_order_id"),
  woNo: text("wo_no"),
  sku: text("sku"),
  description: text("description").notNull(),
  disposition: text("disposition").notNull().default("pending"),
  status: text("status").notNull().default("open"), // open | closed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const capas = pgTable("capas", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  capaNo: text("capa_no").notNull(),
  ncrId: uuid("ncr_id"),
  ncrNo: text("ncr_no"),
  action: text("action").notNull(),
  owner: text("owner"),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("open"), // open | in-progress | closed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
