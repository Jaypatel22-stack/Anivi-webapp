import Link from "next/link";
import { createInventoryItemAction } from "../../../../actions.js";

export default async function NewInventoryItemPage({ searchParams }) {
  const sp = await searchParams;
  const error = sp?.error;

  return (
    <div className="view">
      <div className="panel-head"><div><h2>New inventory item</h2></div></div>
      {error ? <div className="callout">{error}</div> : null}
      <form action={createInventoryItemAction} className="form-card">
        <div className="two-col">
          <div className="field">
            <label htmlFor="sku">SKU</label>
            <input id="sku" name="sku" placeholder="e.g. steel-plate-6mm" required />
          </div>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required />
          </div>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue="raw">
              <option value="raw">Raw material</option>
              <option value="finished">Finished good</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" name="location" placeholder="e.g. Rack A2" />
          </div>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="qtyOnHand">Qty on hand</label>
            <input id="qtyOnHand" name="qtyOnHand" type="number" min="0" defaultValue={0} required />
          </div>
          <div className="field">
            <label htmlFor="reorderPoint">Reorder point</label>
            <input id="reorderPoint" name="reorderPoint" type="number" min="0" defaultValue={10} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="unitCost">Unit cost ($)</label>
          <input id="unitCost" name="unitCost" type="number" min="0" step="0.01" defaultValue={0} />
        </div>
        <div className="form-actions">
          <Link href="/inventory/stock" className="btn">Cancel</Link>
          <button type="submit" className="btn primary">Add item</button>
        </div>
      </form>
    </div>
  );
}
