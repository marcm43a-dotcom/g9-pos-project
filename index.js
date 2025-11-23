/**
 * POS Script - Finalized, organized, and commented for high-school readers
 *
 * Naming conventions:
 * - All variables start with var_ (e.g., var_pos_inventory)
 * - All functions start with fnc_ (e.g., fnc_addNewItem)
 *
 * What this file does (short):
 * - Keeps a list of items (inventory)
 * - Lets an admin add / remove / edit items
 * - Lets customers add items to a cart and purchase
 * - Shows images for items using IID-based filenames (tries multiple extensions)
 * - Logs purchases with timestamps
 *
 * Read the inline comments inside each function for a clear explanation.
 */

/* ============================
   Global state and small helpers
   ============================ */

/* App state variables (all prefixed with var_) */
let var_dev_user = 0;                 // 1 when admin is logged in
let var_dev_user_viewing_logs = 0;    // 1 when checkout shows logs instead of cart
let var_discount_percentage = 0;      // discount percent applied to subtotal
let var_tax_percentage = 0;           // tax percent applied after discount
let var_logs = [];                    // array of strings describing purchases

/* Inventory array starts empty as requested */
let var_pos_inventory = [];

/* Small helper functions (short names, still prefixed) */
const fnc_qs = sel => document.querySelector(sel);            // querySelector
const fnc_qsa = sel => Array.from(document.querySelectorAll(sel)); // querySelectorAll -> array
const fnc_formatPhp = n => `Php ${Number(n).toFixed(2)}`;     // format number as currency

/* ============================
   Image helpers
   ============================ */

/**
 * fnc_tryExtensionsSetBackground
 * - Purpose: Try several file extensions (jpg, png, webp, jpeg) for a base path
 *   and set the first one that loads as the background-image of a DIV.
 * - Inputs:
 *   - var_divEl: the DIV element to set the background on
 *   - var_basePathWithoutExt: base path like "assets/iid_image/3" (no extension)
 *   - var_extensions: array of extensions to try (optional)
 * - Why this exists: Some images might be .jpg, others .png. This function
 *   checks each option and uses the first one that actually loads.
 */
function fnc_tryExtensionsSetBackground(var_divEl, var_basePathWithoutExt, var_extensions = ["jpg", "png", "webp", "jpeg"]) {
  if (!var_divEl || !var_basePathWithoutExt) return;
  let var_i = 0;

  function fnc_tryNext() {
    if (var_i >= var_extensions.length) {
      // none of the extensions worked; clear background and mark no-image
      var_divEl.style.backgroundImage = "";
      var_divEl.classList.add("no-image");
      return;
    }
    const var_url = `${var_basePathWithoutExt}.${var_extensions[var_i++]}`;
    const var_img = new Image();
    var_img.onload = function () {
      // success: set background and stop trying
      var_divEl.style.backgroundImage = `url("${var_url}")`;
      var_divEl.style.backgroundSize = "cover";
      var_divEl.style.backgroundPosition = "center";
      var_divEl.style.backgroundRepeat = "no-repeat";
      var_divEl.classList.remove("no-image");
      var_img.onload = null;
      var_img.onerror = null;
    };
    var_img.onerror = function () {
      // failed: try the next extension
      var_img.onload = null;
      var_img.onerror = null;
      fnc_tryNext();
    };
    var_img.src = var_url;
  }

  fnc_tryNext();
}

/**
 * fnc_imageBaseForIID
 * - Purpose: Return the base path for an IID-based image (no extension).
 * - Example: fnc_imageBaseForIID(3) -> "assets/iid_image/3"
 */
function fnc_imageBaseForIID(var_iid) {
  return `assets/iid_image/${var_iid}`;
}

/* ============================
   Inventory helpers (CRUD)
   ============================ */

/**
 * fnc_assignInventoryIds
 * - Purpose: Make sure every item has a correct IID and valid fields.
 * - What it does:
 *   - Sets var_iid_number to the item's position (1-based)
 *   - Ensures var_item_image_base exists (derived from IID if missing)
 *   - Ensures name, price, stock, quantity are present and numeric
 * - When to call: after adding or removing items so IIDs stay consistent.
 */
function fnc_assignInventoryIds() {
  var_pos_inventory.forEach((var_item, var_index) => {
    const var_iid = var_index + 1;
    var_item.var_iid_number = var_iid;
    var_item.var_item_image_base = var_item.var_item_image_base || fnc_imageBaseForIID(var_iid);
    var_item.var_item_name = var_item.var_item_name || `Item ${var_iid}`;
    var_item.var_item_price = Number(var_item.var_item_price || 0);
    var_item.var_item_stock = Number(var_item.var_item_stock || 0);
    var_item.var_item_quantity = Number(var_item.var_item_quantity || 0);
  });
}

/**
 * fnc_addNewItem
 * - Purpose: Add a new item to the inventory.
 * - Behavior:
 *   - New item gets IID = current length + 1
 *   - Default values: price = 1, stock = 1, quantity = 0
 *   - Image base path uses the IID
 * - Side effects: updates var_pos_inventory, reassigns IIDs, re-renders UI
 */
function fnc_addNewItem() {
  const var_newIid = var_pos_inventory.length + 1;
  var_pos_inventory.push({
    var_iid_number: var_newIid,
    var_item_name: `Item ${var_newIid}`,
    var_item_price: 1,                       // start price at 1
    var_item_stock: 1,                       // start stock at 1
    var_item_quantity: 0,
    var_item_image_base: fnc_imageBaseForIID(var_newIid)
  });
  fnc_assignInventoryIds();
  fnc_renderInventory();
  fnc_renderCheckout();
}

/**
 * fnc_removeItemByIID
 * - Purpose: Remove an item by asking the admin for its IID.
 * - Flow:
 *   1. Prompt for IID
 *   2. Validate the IID is in range
 *   3. Ask for confirmation
 *   4. Remove the item, reassign IIDs, re-render
 */
function fnc_removeItemByIID() {
  const var_raw = prompt("Enter IID of the item to remove:");
  if (var_raw === null) return; // user cancelled
  const var_iid = parseInt(var_raw, 10);
  if (isNaN(var_iid) || var_iid < 1 || var_iid > var_pos_inventory.length) {
    alert("Invalid IID.");
    return;
  }
  const var_index = var_iid - 1;
  const var_item = var_pos_inventory[var_index];
  const var_ok = confirm(`Remove item IID ${var_iid} - "${var_item.var_item_name}"? This cannot be undone.`);
  if (!var_ok) return;

  var_pos_inventory.splice(var_index, 1);
  fnc_assignInventoryIds();
  fnc_renderInventory();
  fnc_renderCheckout();
  alert(`Item IID ${var_iid} removed.`);
}

/**
 * fnc_editItemByIID
 * - Purpose: Edit an item's name, stock, or price by IID.
 * - Flow:
 *   1. Prompt for IID and validate
 *   2. Prompt for which field to edit (name|stock|price)
 *   3. Prompt for new value and validate it
 *   4. Confirm change and apply
 *   5. Re-render UI
 * - Notes: If stock is lowered below current quantity in cart, quantity is reduced.
 */
function fnc_editItemByIID() {
  const var_raw = prompt("Enter IID of the item to edit:");
  if (var_raw === null) return;
  const var_iid = parseInt(var_raw, 10);
  if (isNaN(var_iid) || var_iid < 1 || var_iid > var_pos_inventory.length) {
    alert("Invalid IID.");
    return;
  }
  const var_index = var_iid - 1;
  const var_item = var_pos_inventory[var_index];

  const var_fieldRaw = prompt("Which field do you want to edit? Enter one of: name, stock, price");
  if (var_fieldRaw === null) return;
  const var_field = var_fieldRaw.trim().toLowerCase();
  if (!["name", "stock", "price"].includes(var_field)) {
    alert("Invalid field. Choose name, stock, or price.");
    return;
  }

  const var_current = var_field === "name" ? var_item.var_item_name : var_field === "stock" ? var_item.var_item_stock : var_item.var_item_price;
  const var_newValRaw = prompt(`Enter new value for ${var_field} (current: ${var_current}):`);
  if (var_newValRaw === null) return;

  if (var_field === "name") {
    const var_newName = var_newValRaw.trim();
    if (!var_newName) { alert("Name cannot be empty."); return; }
    if (!confirm(`Set name of IID ${var_iid} from "${var_item.var_item_name}" to "${var_newName}"?`)) return;
    var_item.var_item_name = var_newName;
  } else if (var_field === "stock") {
    const var_newStock = parseInt(var_newValRaw, 10);
    if (isNaN(var_newStock) || var_newStock < 0) { alert("Stock must be a non-negative integer."); return; }
    if (!confirm(`Set stock of IID ${var_iid} from ${var_item.var_item_stock} to ${var_newStock}?`)) return;
    var_item.var_item_stock = var_newStock;
    if (var_item.var_item_quantity > var_item.var_item_stock) var_item.var_item_quantity = var_item.var_item_stock;
  } else { // price
    const var_newPrice = parseFloat(var_newValRaw);
    if (isNaN(var_newPrice) || var_newPrice < 0) { alert("Price must be a non-negative number."); return; }
    if (!confirm(`Set price of IID ${var_iid} from ${fnc_formatPhp(var_item.var_item_price)} to ${fnc_formatPhp(var_newPrice)}?`)) return;
    var_item.var_item_price = var_newPrice;
  }

  fnc_renderInventory();
  fnc_renderCheckout();
  alert(`Item IID ${var_iid} updated.`);
}

/* ============================
   Totals and summary
   ============================ */

/**
 * fnc_calculateTotals
 * - Purpose: Compute subtotal, discount, tax, and final total.
 * - Returns: an object { subtotal, discount, afterDiscount, tax, total }
 * - How it works:
 *   - subtotal = sum(price * quantity) for items in cart
 *   - discount = subtotal * (discountPercent / 100)
 *   - afterDiscount = subtotal - discount
 *   - tax = afterDiscount * (taxPercent / 100)
 *   - total = afterDiscount + tax
 */
function fnc_calculateTotals() {
  const var_subtotal = var_pos_inventory.reduce((var_sum, var_it) => {
    return var_sum + (var_it.var_item_quantity >= 1 ? var_it.var_item_price * var_it.var_item_quantity : 0);
  }, 0);
  const var_discount = var_subtotal * (var_discount_percentage / 100);
  const var_afterDiscount = var_subtotal - var_discount;
  const var_tax = var_afterDiscount * (var_tax_percentage / 100);
  const var_total = var_afterDiscount + var_tax;
  return { subtotal: var_subtotal, discount: var_discount, afterDiscount: var_afterDiscount, tax: var_tax, total: var_total };
}

/**
 * fnc_updateSummary
 * - Purpose: Put the calculated totals into the checkout area on the page.
 * - Side effects: updates DOM elements for subtotal, discount, tax, total, and percentage labels.
 */
function fnc_updateSummary() {
  const var_totals = fnc_calculateTotals();
  const fnc_setText = (var_sel, var_txt) => { const var_el = fnc_qs(var_sel); if (var_el) var_el.textContent = var_txt; };
  fnc_setText("#div-subtotal_value", fnc_formatPhp(var_totals.subtotal));
  fnc_setText("#div-discount_value", fnc_formatPhp(var_totals.discount));
  fnc_setText("#div-tax_value", fnc_formatPhp(var_totals.tax));
  fnc_setText("#div-total_amount_value", fnc_formatPhp(var_totals.total));
  fnc_setText("#div-discount_percentage_value", `Discount: ${var_discount_percentage}%`);
  fnc_setText("#div-tax_percentage_value", `Tax: ${var_tax_percentage}%`);
}

/**
 * fnc_updateButtonsState
 * - Purpose: Enable or disable the PURCHASE and CLEAR buttons depending on whether the cart has items.
 * - Logic: If total cart quantity is 0, disable both buttons.
 */
function fnc_updateButtonsState() {
  const var_checkoutDiv = fnc_qs("#div-checkout");
  if (!var_checkoutDiv) return;
  const var_purchaseBtn = var_checkoutDiv.querySelector(".div-purchase_button");
  const var_clearBtn = var_checkoutDiv.querySelector(".div-clear_list");
  const var_cartCount = var_pos_inventory.reduce((var_acc, var_it) => var_acc + (var_it.var_item_quantity >= 1 ? var_it.var_item_quantity : 0), 0);
  if (var_purchaseBtn) var_purchaseBtn.disabled = var_cartCount === 0;
  if (var_clearBtn) var_clearBtn.disabled = var_cartCount === 0;
}

/* ============================
   Checkout rendering & actions
   ============================ */

/**
 * fnc_renderCheckoutItems
 * - Purpose: Render the list of items currently in the cart (quantity >= 1).
 * - Behavior:
 *   - Creates a row for each item in the cart with + and - buttons
 *   - Uses event delegation on the list container to handle + and - clicks
 */
function fnc_renderCheckoutItems() {
  const var_listDiv = fnc_qs("#div-list");
  if (!var_listDiv) return;
  var_listDiv.innerHTML = "";

  var_pos_inventory.forEach((var_item, var_index) => {
    if (var_item.var_item_quantity >= 1) {
      const var_itemTotal = var_item.var_item_price * var_item.var_item_quantity;
      const var_row = document.createElement("div");
      var_row.className = "div-listed_item";
      var_row.dataset.index = var_index;
      var_row.innerHTML = `
        <p class="div-listed_item_name">${var_item.var_item_name}</p>
        <button class="div-listed_item_add_quantity">+</button>
        <p class="div-listed_item_quantity_value">${var_item.var_item_quantity}</p>
        <button class="div-listed_item_subtract_quantity">-</button>
        <p class="div-listed_item_price">${fnc_formatPhp(var_itemTotal)}</p>
      `;
      var_listDiv.appendChild(var_row);
    }
  });

  // Delegated click handler for + and - buttons inside the list
  var_listDiv.onclick = (var_e) => {
    const var_btn = var_e.target.closest("button");
    if (!var_btn) return;
    const var_parent = var_btn.closest(".div-listed_item");
    if (!var_parent) return;
    const var_idx = Number(var_parent.dataset.index);
    const var_item = var_pos_inventory[var_idx];
    if (!var_item) return;

    if (var_btn.classList.contains("div-listed_item_add_quantity")) {
      if (var_item.var_item_quantity < var_item.var_item_stock) var_item.var_item_quantity++;
      else alert("Reached maximum stock for this item.");
    } else if (var_btn.classList.contains("div-listed_item_subtract_quantity")) {
      if (var_item.var_item_quantity > 0) var_item.var_item_quantity--;
    }

    fnc_renderCheckoutItems();
    fnc_updateSummary();
    fnc_updateButtonsState();
    fnc_renderInventory();
  };

  fnc_updateSummary();
  fnc_updateButtonsState();
}

/**
 * fnc_handlePurchase
 * - Purpose: Finalize the purchase:
 *   - Create a timestamped log entry
 *   - Reduce stock by purchased quantities
 *   - Clear quantities (cart)
 *   - Re-render checkout and inventory
 */
function fnc_handlePurchase() {
  const var_purchased = var_pos_inventory.filter(var_it => var_it.var_item_quantity >= 1);
  if (var_purchased.length === 0) { alert("No items in cart to purchase."); return; }

  const var_purchasedItems = var_purchased.map(var_it => `${var_it.var_item_name} x${var_it.var_item_quantity}`);
  const var_totals = fnc_calculateTotals();
  const var_timestamp = new Date().toLocaleString();
  const var_logString = `${var_timestamp} - Items: ${var_purchasedItems.join(", ")} - Total: ${fnc_formatPhp(var_totals.total)}`;

  var_logs.push(var_logString);

  var_pos_inventory.forEach(var_it => {
    if (var_it.var_item_quantity >= 1) {
      var_it.var_item_stock = Math.max(0, var_it.var_item_stock - var_it.var_item_quantity);
      var_it.var_item_quantity = 0;
    }
  });

  fnc_renderCheckout();
  fnc_renderInventory();
  if (var_dev_user_viewing_logs === 1) fnc_renderLogsView();
  alert("Purchase recorded.");
}

/* ============================
   Inventory rendering
   ============================ */

/**
 * fnc_renderInventory
 * - Purpose: Draw all inventory slots into #div-inventory.
 * - Notes:
 *   - Each slot is a button that shows IID, optional status, name, stock, and price.
 *   - The status (.div-item_status) is shown only when var_item_quantity >= 1.
 *   - Background image is set on .div-item_image using fnc_tryExtensionsSetBackground.
 */
function fnc_renderInventory() {
  const var_inventoryDiv = fnc_qs("#div-inventory");
  if (!var_inventoryDiv) return;
  var_inventoryDiv.innerHTML = "";

  var_pos_inventory.forEach((var_item, var_index) => {
    const var_showStatus = var_item.var_item_quantity >= 1;
    const var_slot = document.createElement("button");
    var_slot.className = "div-inventory_slot";
    var_slot.dataset.index = var_index;
    if (var_item.var_item_stock === 0 && var_item.var_item_quantity === 0) var_slot.disabled = true;

    var_slot.innerHTML = `
      <div class="div-item_frame">
        <div class="div-item_image" aria-hidden="true">
          <p class="div-item_id">IID ${var_item.var_iid_number}</p>
          ${var_showStatus ? `<p class="div-item_status">LISTED</p>` : ""}
          <p class="div-item_name">${var_item.var_item_name}</p>
          <p class="div-item_stock">${String(var_item.var_item_stock).padStart(2, "0")} in stock</p>
        </div>
      </div>
      <p class="div-item_price">${fnc_formatPhp(var_item.var_item_price)}</p>
    `;

    var_inventoryDiv.appendChild(var_slot);

    const var_imageContainer = var_slot.querySelector(".div-item_image");
    if (var_imageContainer) {
      var_imageContainer.style.width = "100%";
      var_imageContainer.style.height = "100px"; // adjust in CSS if needed
      var_imageContainer.style.backgroundSize = "cover";
      var_imageContainer.style.backgroundPosition = "center";
      var_imageContainer.style.backgroundRepeat = "no-repeat";
      fnc_tryExtensionsSetBackground(var_imageContainer, var_item.var_item_image_base || fnc_imageBaseForIID(var_item.var_iid_number));
    }
  });

  // Delegated click handler for inventory slots: add 1 to cart if allowed
  var_inventoryDiv.onclick = (var_e) => {
    const var_slot = var_e.target.closest(".div-inventory_slot");
    if (!var_slot) return;
    const var_idx = Number(var_slot.dataset.index);
    const var_item = var_pos_inventory[var_idx];
    if (!var_item) return;

    // If item has zero stock and not already in cart, prevent adding
    if (var_item.var_item_stock <= 0 && var_item.var_item_quantity === 0) {
      alert("Item out of stock.");
      return;
    }

    if (var_item.var_item_quantity < var_item.var_item_stock) var_item.var_item_quantity++;
    else alert("Reached maximum stock for this item.");

    fnc_renderCheckoutItems();
    fnc_updateSummary();
    fnc_updateButtonsState();
    fnc_renderInventory();
  };
}

/* ============================
   Logs rendering
   ============================ */

/**
 * fnc_renderLogsView
 * - Purpose: Show the purchase logs inside #div-view_logs.
 * - Behavior: If there are no logs, show "No logs yet."
 */
function fnc_renderLogsView() {
  const var_viewLogsDiv = fnc_qs("#div-view_logs");
  if (!var_viewLogsDiv) return;
  var_viewLogsDiv.innerHTML = "";
  if (var_logs.length === 0) {
    var_viewLogsDiv.innerHTML = "<p>No logs yet.</p>";
    return;
  }
  const var_ul = document.createElement("ul");
  var_logs.forEach((var_log, var_idx) => {
    const var_li = document.createElement("li");
    var_li.textContent = `${var_idx + 1}. ${var_log}`;
    var_ul.appendChild(var_li);
  });
  var_viewLogsDiv.appendChild(var_ul);
}

/* ============================
   Admin / UI wiring
   ============================ */

/**
 * fnc_getCheckoutHTML
 * - Purpose: Return the static HTML used for the checkout area when not viewing logs.
 * - Keep this structure if your HTML/CSS expects these elements.
 */
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
      </div>
      <div class="div-list_amount_value">
        <p id="div-subtotal_value">Php 000000.00</p>
        <p id="div-discount_value">Php 000000.00</p>
        <p id="div-tax_value">Php 000000.00</p>
        <p id="div-total_amount_value">Php 000000.00</p>
      </div>
    </div>
    <button class="div-purchase_button">PURCHASE</button>
  `;
}

/**
 * fnc_renderCheckout
 * - Purpose: Render the checkout panel or the logs view (if admin requested logs).
 * - Behavior:
 *   - If var_dev_user_viewing_logs === 1, show logs and an EXIT LOGS button
 *   - Otherwise, show the checkout HTML, wire PURCHASE and CLEAR buttons
 */
function fnc_renderCheckout() {
  const var_checkoutDiv = fnc_qs("#div-checkout");
  if (!var_checkoutDiv) return;

  if (var_dev_user_viewing_logs === 1) {
    var_checkoutDiv.innerHTML = `
      CHECKOUT
      <button class="div-exit_logs">EXIT LOGS</button>
      <div id="div-view_logs"></div>
    `;
    const var_exitBtn = fnc_qs(".div-exit_logs");
    if (var_exitBtn) var_exitBtn.onclick = () => { var_dev_user_viewing_logs = 0; fnc_renderCheckout(); };
    fnc_renderLogsView();
    return;
  }

  var_checkoutDiv.innerHTML = fnc_getCheckoutHTML();
  fnc_renderCheckoutItems();

  const var_purchaseBtn = var_checkoutDiv.querySelector(".div-purchase_button");
  if (var_purchaseBtn) var_purchaseBtn.onclick = fnc_handlePurchase;

  const var_clearBtn = var_checkoutDiv.querySelector(".div-clear_list");
  if (var_clearBtn) {
    var_clearBtn.onclick = () => {
      var_pos_inventory.forEach(var_it => var_it.var_item_quantity = 0);
      fnc_renderCheckout();
      fnc_renderInventory();
    };
  }

  fnc_updateButtonsState();
}

/* Admin button helpers: hide/show admin-only controls */
function fnc_hideButtons() {
  const var_selectors = [".div-set_tax", ".div-set_discount", ".div-add_item", ".div-edit_item", ".div-remove_item", ".div-logs", ".div-logout"];
  var_selectors.forEach(var_s => { const var_el = fnc_qs(var_s); if (var_el) var_el.style.display = "none"; });
  return var_selectors;
}
function fnc_showButtons(var_list) {
  var_list.forEach(var_s => { const var_el = fnc_qs(var_s); if (var_el) var_el.style.display = "inline-block"; });
}

/**
 * fnc_enableDevMode
 * - Purpose: Turn on admin mode and wire admin controls (discount, tax, add, edit, remove, logs, logout).
 * - Inputs:
 *   - var_settingsBtn: the settings button element (will be disabled while admin is active)
 *   - var_buttonsToShow: list of selectors returned by fnc_hideButtons (so we can show them)
 */
function fnc_enableDevMode(var_settingsBtn, var_buttonsToShow) {
  var_dev_user = 1;
  if (var_settingsBtn) var_settingsBtn.disabled = true;
  fnc_showButtons(var_buttonsToShow);

  const var_discountBtn = fnc_qs(".div-set_discount");
  const var_taxBtn = fnc_qs(".div-set_tax");
  const var_addItemBtn = fnc_qs(".div-add_item");
  const var_editItemBtn = fnc_qs(".div-edit_item");
  const var_removeItemBtn = fnc_qs(".div-remove_item");
  const var_logsBtn = fnc_qs(".div-logs");
  const var_logoutBtn = fnc_qs(".div-logout");

  if (var_discountBtn) var_discountBtn.onclick = () => {
    const var_v = prompt("Enter discount percentage:");
    if (var_v !== null && !isNaN(var_v)) { var_discount_percentage = Math.max(0, parseFloat(var_v)); fnc_updateSummary(); fnc_updateButtonsState(); }
  };
  if (var_taxBtn) var_taxBtn.onclick = () => {
    const var_v = prompt("Enter tax percentage:");
    if (var_v !== null && !isNaN(var_v)) { var_tax_percentage = Math.max(0, parseFloat(var_v)); fnc_updateSummary(); fnc_updateButtonsState(); }
  };
  if (var_addItemBtn) var_addItemBtn.onclick = fnc_addNewItem;
  if (var_removeItemBtn) var_removeItemBtn.onclick = fnc_removeItemByIID;
  if (var_editItemBtn) var_editItemBtn.onclick = fnc_editItemByIID;
  if (var_logsBtn) var_logsBtn.onclick = () => { var_dev_user_viewing_logs = 1; fnc_renderCheckout(); };
  if (var_logoutBtn) var_logoutBtn.onclick = () => { if (confirm("Do you want to logout?")) fnc_disableDevMode(var_settingsBtn, var_buttonsToShow); };
}

/**
 * fnc_disableDevMode
 * - Purpose: Turn off admin mode and reset admin-only state (discount/tax).
 */
function fnc_disableDevMode(var_settingsBtn, var_buttonsToHide) {
  var_dev_user = 0;
  var_dev_user_viewing_logs = 0;
  if (var_settingsBtn) var_settingsBtn.disabled = false;
  fnc_hideButtons();
  var_discount_percentage = 0;
  var_tax_percentage = 0;
  fnc_renderCheckout();
  fnc_renderInventory();
}

/* ============================
   Initialization
   ============================ */

/**
 * fnc_setupButtons
 * - Purpose: Wire the settings button so an admin can log in with a code.
 * - Behavior:
 *   - Hides admin buttons initially
 *   - When settings is clicked, prompt for code; if correct, enable admin mode
 */
function fnc_setupButtons() {
  const var_settingsBtn = fnc_qs(".div-settings");
  const var_buttonsToHide = fnc_hideButtons();
  if (!var_settingsBtn) return;
  var_settingsBtn.onclick = () => {
    if (var_dev_user !== 1) {
      const var_code = prompt("Enter admin code:");
      if (var_code === "admin1234") fnc_enableDevMode(var_settingsBtn, var_buttonsToHide);
      else alert("Access denied. Incorrect code.");
    }
  };
}

/* Run on page load */
document.addEventListener("DOMContentLoaded", function () {
  fnc_assignInventoryIds(); // normalize inventory (empty at start)
  fnc_renderCheckout();     // render checkout area
  fnc_renderInventory();    // render inventory area (empty)
  fnc_setupButtons();       // wire settings/admin flow
});
