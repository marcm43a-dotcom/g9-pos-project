let var_dev_user = 0,
  var_dev_user_viewing_logs = 0,
  var_discount_percentage = 0,
  var_tax_percentage = 0,
  var_logs = [],
  var_pos_inventory = [],
  var_customer_cash = 0,
  var_customer_change = 0;

const fnc_qs = s => document.querySelector(s),
  fnc_formatPhp = n => `Php ${Number(n).toFixed(2)}`;

function fnc_tryExtensionsSetBackground(el, base, exts = ["jpg", "png", "webp", "jpeg"]) {
  if (!el || !base) return;
  let i = 0;
  (function next() {
    if (i >= exts.length) { el.style.backgroundImage = ""; return; }
    const url = `${base}.${exts[i++]}`, img = new Image();
    img.onload = () => { el.style.backgroundImage = `url("${url}")`; img.onload = img.onerror = null; };
    img.onerror = () => { img.onload = img.onerror = null; next(); };
    img.src = url;
  })();
}

const fnc_imageBaseForIID = iid => `assets/iid_image/${iid}`;

function fnc_assignInventoryIds() {
  var_pos_inventory.forEach((it, idx) => {
    const iid = idx + 1;
    it.var_iid_number = iid;
    it.var_item_image_base = it.var_item_image_base || fnc_imageBaseForIID(iid);
    it.var_item_name = it.var_item_name || `Item ${iid}`;
    it.var_item_price = Number(it.var_item_price || 0);
    it.var_item_stock = Number(it.var_item_stock || 0);
    it.var_item_quantity = Number(it.var_item_quantity || 0);
  });
}

function fnc_addNewItem() {
  const iid = var_pos_inventory.length + 1;
  var_pos_inventory.push({
    var_iid_number: iid,
    var_item_name: `Item ${iid}`,
    var_item_price: 1,
    var_item_stock: 1,
    var_item_quantity: 0,
    var_item_image_base: fnc_imageBaseForIID(iid)
  });
  fnc_assignInventoryIds();
  fnc_refreshUI();
}

function fnc_removeItemByIID() {
  let iid;
  while (true) {
    const r = prompt("Enter IID of the item to remove:");
    if (r === null) return;
    iid = parseInt(r, 10);
    if (!isNaN(iid) && iid >= 1 && iid <= var_pos_inventory.length) break;
    alert("Invalid IID. Try again or Cancel to exit.");
  }
  const idx = iid - 1, it = var_pos_inventory[idx];
  if (!confirm(`Remove IID ${iid} - "${it.var_item_name}"?`)) return;
  var_pos_inventory.splice(idx, 1);
  fnc_assignInventoryIds();
  fnc_refreshUI();
  alert(`Item IID ${iid} removed.`);
}

function fnc_editItemByIID() {
  let iid;
  while (true) {
    const r = prompt("Enter IID of the item to edit:");
    if (r === null) return;
    iid = parseInt(r, 10);
    if (!isNaN(iid) && iid >= 1 && iid <= var_pos_inventory.length) break;
    alert("Invalid IID. Try again or Cancel to exit.");
  }
  const item = var_pos_inventory[iid - 1];
  let field;
  while (true) {
    const f = prompt("Which field to edit? Enter: name, stock, price");
    if (f === null) return;
    field = f.trim().toLowerCase();
    if (["name", "stock", "price"].includes(field)) break;
    alert("Invalid choice. Use name, stock, or price.");
  }

  while (true) {
    const current = field === "name" ? item.var_item_name : field === "stock" ? item.var_item_stock : item.var_item_price;
    const v = prompt(`Enter new value for ${field} (current: ${current}):`);
    if (v === null) return;
    if (field === "name") {
      const nv = v.trim();
      if (!nv) { alert("Name cannot be empty."); continue; }
      if (!confirm(`Change name from "${item.var_item_name}" to "${nv}"?`)) { alert("Change cancelled."); continue; }
      item.var_item_name = nv; break;
    }
    if (field === "stock") {
      const nv = parseInt(v, 10);
      if (isNaN(nv) || nv < 0) { alert("Stock must be a non-negative integer."); continue; }
      if (!confirm(`Change stock from ${item.var_item_stock} to ${nv}?`)) { alert("Change cancelled."); continue; }
      item.var_item_stock = nv;
      if (item.var_item_quantity > nv) item.var_item_quantity = nv;
      break;
    }
    const nv = parseFloat(v);
    if (isNaN(nv) || nv < 0) { alert("Price must be a non-negative number."); continue; }
    if (!confirm(`Change price from ${fnc_formatPhp(item.var_item_price)} to ${fnc_formatPhp(nv)}?`)) { alert("Change cancelled."); continue; }
    item.var_item_price = nv; break;
  }

  fnc_refreshUI();
  alert(`Item IID ${iid} updated.`);
}

function fnc_calculateTotals() {
  const subtotal = var_pos_inventory.reduce((s, it) => s + (it.var_item_quantity >= 1 ? it.var_item_price * it.var_item_quantity : 0), 0);
  const discount = subtotal * (var_discount_percentage / 100);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (var_tax_percentage / 100);
  const total = afterDiscount + tax;
  return { subtotal, discount, afterDiscount, tax, total };
}

function fnc_displayOrNoInput(amount) {
  return amount === 0 ? "No Inputs" : fnc_formatPhp(amount);
}

function fnc_updateSummary() {
  const t = fnc_calculateTotals();
  const set = (sel, txt) => { const el = fnc_qs(sel); if (el) el.textContent = txt; };
  set("#div-subtotal_value", fnc_displayOrNoInput(t.subtotal));
  set("#div-discount_value", fnc_displayOrNoInput(t.discount));
  set("#div-tax_value", fnc_displayOrNoInput(t.tax));
  set("#div-total_amount_value", fnc_displayOrNoInput(t.total));
  set("#div-customer_cash_value", fnc_displayOrNoInput(var_customer_cash));
  set("#div-customer_change_value", fnc_displayOrNoInput(var_customer_change));
  set("#div-discount_percentage_value", `Discount: ${var_discount_percentage}%`);
  set("#div-tax_percentage_value", `Tax: ${var_tax_percentage}%`);
}

function fnc_updateButtonsState() {
  const co = fnc_qs("#div-checkout");
  if (!co) return;
  const p = co.querySelector(".div-purchase_button"), clr = co.querySelector(".div-clear_list");
  const count = var_pos_inventory.reduce((a, it) => a + (it.var_item_quantity >= 1 ? it.var_item_quantity : 0), 0);
  if (p) p.disabled = count === 0;
  if (clr) clr.disabled = count === 0;
}

function fnc_refreshUI() {
  fnc_renderCheckoutItems();
  fnc_updateSummary();
  fnc_updateButtonsState();
  fnc_renderInventory();
}

function fnc_renderCheckoutItems() {
  const list = fnc_qs("#div-list");
  if (!list) return;
  list.innerHTML = "";
  var_pos_inventory.forEach((it, idx) => {
    if (it.var_item_quantity >= 1) {
      const row = document.createElement("div");
      row.className = "div-listed_item";
      row.dataset.index = idx;
      row.innerHTML = `
        <p class="div-listed_item_name">${it.var_item_name}</p>
        <button class="div-listed_item_add_quantity">+</button>
        <p class="div-listed_item_quantity_value">${it.var_item_quantity}</p>
        <button class="div-listed_item_subtract_quantity">-</button>
        <p class="div-listed_item_price">${fnc_formatPhp(it.var_item_price * it.var_item_quantity)}</p>
      `;
      list.appendChild(row);
    }
  });

  list.onclick = e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const parent = btn.closest(".div-listed_item");
    if (!parent) return;
    const idx = Number(parent.dataset.index), it = var_pos_inventory[idx];
    if (!it) return;
    if (btn.classList.contains("div-listed_item_add_quantity")) {
      if (it.var_item_quantity < it.var_item_stock) it.var_item_quantity++;
      else alert("Reached maximum stock for this item.");
    } else if (btn.classList.contains("div-listed_item_subtract_quantity")) {
      if (it.var_item_quantity > 0) it.var_item_quantity--;
    }
    fnc_refreshUI();
  };
}

function fnc_handlePurchase() {
  const cart = var_pos_inventory.filter(it => it.var_item_quantity >= 1);
  if (!cart.length) { alert("No items in cart to purchase."); return; }
  const t = fnc_calculateTotals();

  if (!var_customer_cash || var_customer_cash <= 0) {
    const r = prompt("Enter customer cash amount:");
    if (r === null) return;
    const c = parseFloat(r);
    if (isNaN(c) || c < 0) { alert("Invalid cash amount."); return; }
    var_customer_cash = c;
    var_customer_change = Math.max(0, var_customer_cash - t.total);
    fnc_updateSummary();
    alert("Cash recorded. Press PURCHASE again to proceed.");
    return;
  }

  if (var_customer_cash < t.total) {
    alert(`Insufficient cash. Need ${fnc_formatPhp(t.total - var_customer_cash)} more.`);
    return;
  }

  if (!confirm("Proceed with purchasing the items?")) return;

  var_customer_change = var_customer_cash - t.total;
  const items = cart.map(it => `${it.var_item_name} x${it.var_item_quantity}`);
  const ts = new Date().toLocaleString();
  var_logs.push(`${ts} - Items: ${items.join(", ")} - Total: ${fnc_formatPhp(t.total)} - Cash: ${fnc_formatPhp(var_customer_cash)} - Change: ${fnc_formatPhp(var_customer_change)}`);

  var_pos_inventory.forEach(it => {
    if (it.var_item_quantity >= 1) {
      it.var_item_stock = Math.max(0, it.var_item_stock - it.var_item_quantity);
      it.var_item_quantity = 0;
    }
  });

  alert("Thank you!");
  var_customer_cash = 0;
  var_customer_change = 0;
  fnc_renderCheckout();
  fnc_renderInventory();
  if (var_dev_user_viewing_logs === 1) fnc_renderLogsView();
}

function fnc_renderInventory() {
  const inv = fnc_qs("#div-inventory");
  if (!inv) return;
  inv.innerHTML = "";
  var_pos_inventory.forEach((it, idx) => {
    const slot = document.createElement("button");
    slot.className = "div-inventory_slot";
    slot.dataset.index = idx;
    if (it.var_item_stock === 0 && it.var_item_quantity === 0) slot.disabled = true;
    const stockText = it.var_item_stock === 0 ? "Out of stock" : `${it.var_item_stock} in stock`;
    slot.innerHTML = `
      <div class="div-item_frame">
        <div class="div-item_image" aria-hidden="true">
          <p class="div-item_id">IID ${it.var_iid_number}</p>
          ${it.var_item_quantity >= 1 ? `<p class="div-item_status">LISTED</p>` : ""}
          <p class="div-item_name">${it.var_item_name}</p>
          <p class="div-item_stock">${stockText}</p>
        </div>
      </div>
      <p class="div-item_price">${fnc_formatPhp(it.var_item_price)}</p>
    `;
    inv.appendChild(slot);
    const img = slot.querySelector(".div-item_image");
    if (img) fnc_tryExtensionsSetBackground(img, it.var_item_image_base || fnc_imageBaseForIID(it.var_iid_number));
  });

  inv.onclick = e => {
    const slot = e.target.closest(".div-inventory_slot");
    if (!slot) return;
    const idx = Number(slot.dataset.index), it = var_pos_inventory[idx];
    if (!it) return;
    if (it.var_item_stock <= 0 && it.var_item_quantity === 0) { alert("Item out of stock."); return; }
    if (it.var_item_quantity < it.var_item_stock) it.var_item_quantity++;
    else alert("Reached maximum stock for this item.");
    fnc_refreshUI();
  };
}

function fnc_renderLogsView() {
  const v = fnc_qs("#div-view_logs");
  if (!v) return;
  v.innerHTML = "";
  if (!var_logs.length) { v.innerHTML = "<p>No logs yet.</p>"; return; }
  const ul = document.createElement("ul");
  var_logs.forEach((log, i) => { const li = document.createElement("li"); li.textContent = `${i + 1}. ${log}`; ul.appendChild(li); });
  v.appendChild(ul);
}

function fnc_getCheckoutHTML() {
  return `
    CHECKOUT
    <button class="div-clear_list">CLEAR</button>
    <div id="div-list"></div>
    <div id="div-list_summary">
      <div class="div-list_percentage_value">
        <p>Subtotal</p>
        <p id="div-discount_percentage_value">Discount: ${var_discount_percentage}%</p>
        <p id="div-tax_percentage_value">Tax: ${var_tax_percentage}%</p>
        <p>Total Amount</p>
        <p>Customer Cash</p>
        <p>Customer Change</p>
      </div>
      <div class="div-list_amount_value">
        <p id="div-subtotal_value">No Inputs</p>
        <p id="div-discount_value">No Inputs</p>
        <p id="div-tax_value">No Inputs</p>
        <p id="div-total_amount_value">No Inputs</p>
        <p id="div-customer_cash_value">No Inputs</p>
        <p id="div-customer_change_value">No Inputs</p>
      </div>
    </div>
    <button class="div-purchase_button">PURCHASE</button>
  `;
}

function fnc_renderCheckout() {
  const co = fnc_qs("#div-checkout");
  if (!co) return;
  if (var_dev_user_viewing_logs === 1) {
    co.innerHTML = `CHECKOUT
      <button class="div-exit_logs">EXIT LOGS</button>
      <div id="div-view_logs"></div>`;
    const ex = fnc_qs(".div-exit_logs"); if (ex) ex.onclick = () => { var_dev_user_viewing_logs = 0; fnc_renderCheckout(); };
    fnc_renderLogsView(); return;
  }
  co.innerHTML = fnc_getCheckoutHTML();
  fnc_renderCheckoutItems();
  const p = co.querySelector(".div-purchase_button"), clr = co.querySelector(".div-clear_list");
  if (p) p.onclick = fnc_handlePurchase;
  if (clr) clr.onclick = () => { var_pos_inventory.forEach(it => it.var_item_quantity = 0); var_customer_cash = 0; var_customer_change = 0; fnc_renderCheckout(); fnc_renderInventory(); };
  fnc_updateButtonsState();
}

function fnc_hideButtons() {
  const sel = [".div-set_tax", ".div-set_discount", ".div-add_item", ".div-edit_item", ".div-remove_item", ".div-logs", ".div-logout"];
  sel.forEach(s => { const el = fnc_qs(s); if (el) el.style.display = "none"; });
  return sel;
}
function fnc_showButtons(list) { list.forEach(s => { const el = fnc_qs(s); if (el) el.style.display = "inline-block"; }); }

function fnc_enableDevMode(settingsBtn, buttonsToShow) {
  var_dev_user = 1; if (settingsBtn) settingsBtn.disabled = true; fnc_showButtons(buttonsToShow);
  const d = fnc_qs(".div-set_discount"), t = fnc_qs(".div-set_tax"), add = fnc_qs(".div-add_item"), ed = fnc_qs(".div-edit_item"), rm = fnc_qs(".div-remove_item"), lg = fnc_qs(".div-logs"), lo = fnc_qs(".div-logout");
  if (d) d.onclick = () => { const v = prompt("Enter discount percentage:"); if (v !== null && !isNaN(v)) { var_discount_percentage = Math.max(0, parseFloat(v)); fnc_updateSummary(); fnc_updateButtonsState(); } };
  if (t) t.onclick = () => { const v = prompt("Enter tax percentage:"); if (v !== null && !isNaN(v)) { var_tax_percentage = Math.max(0, parseFloat(v)); fnc_updateSummary(); fnc_updateButtonsState(); } };
  if (add) add.onclick = fnc_addNewItem;
  if (rm) rm.onclick = fnc_removeItemByIID;
  if (ed) ed.onclick = fnc_editItemByIID;
  if (lg) lg.onclick = () => { var_dev_user_viewing_logs = 1; fnc_renderCheckout(); };
  if (lo) lo.onclick = () => { if (confirm("Do you want to logout?")) fnc_disableDevMode(settingsBtn, buttonsToShow); };
}

function fnc_disableDevMode(settingsBtn, buttonsToHide) {
  var_dev_user = 0; var_dev_user_viewing_logs = 0; if (settingsBtn) settingsBtn.disabled = false; fnc_hideButtons(); var_discount_percentage = 0; var_tax_percentage = 0; fnc_renderCheckout(); fnc_renderInventory();
}

function fnc_setupButtons() {
  const settings = fnc_qs(".div-settings"), hidden = fnc_hideButtons();
  if (!settings) return;
  settings.onclick = () => {
    if (var_dev_user !== 1) {
      const code = prompt("Enter admin code:");
      if (code === "admin1234") fnc_enableDevMode(settings, hidden);
      else alert("Access denied. Incorrect code.");
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  fnc_assignInventoryIds();
  fnc_renderCheckout();
  fnc_renderInventory();
  fnc_setupButtons();
});
