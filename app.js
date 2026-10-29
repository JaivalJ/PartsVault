import { STORAGE_KEY, CATEGORIES, MAX_PARTS, normalizePart, parseInventory, mergeInventory, stockState, selectParts, sampleParts } from './inventory.mjs';

const $ = selector => document.querySelector(selector);
const format = number => number.toLocaleString();
const state = { parts: [], category: '', lowOnly: false, query: '', sort: 'name', editing: null, storageReady: true };
const looks = {
  'Resistors': ['resistor', '#f7f0e8', '#bb9569', '#cba47a'],
  'Capacitors': ['capacitor', '#eaf1fa', '#7a9fc9', '#8bacd8'],
  'Semiconductors': ['diode', '#f9eef0', '#c1899b', '#d1a0ad'],
  'ICs & modules': ['chip', '#f0ebf8', '#a18ac6', '#aa97d1'],
  'Connectors': ['connector', '#edf4ef', '#7fa18d', '#8fb09b'],
  'Sensors': ['sensor', '#f9f2e7', '#c7a063', '#d4b480'],
  'Other': ['box', '#f0eef5', '#9b90ae', '#b1a6bd'],
};
const icons = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let toastTimeout;
function notify(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function storageWarning(message) {
  $('#storage-warning').textContent = message;
  $('#storage-warning').hidden = false;
  $('#save-indicator').textContent = 'Storage needs attention';
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) state.parts = parseInventory(saved);
} catch {
  state.storageReady = false;
  storageWarning('Your saved inventory could not be read. Changes are paused to protect your data. Check browser storage permissions, then reload. You can still import and export backups.');
}
function commit(parts, recover = false) {
  if (!state.storageReady && !recover) {
    notify('Changes are paused. Check browser storage or import a valid backup.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, parts }));
    state.parts = parts;
    state.storageReady = true;
    $('#storage-warning').hidden = true;
    $('#save-indicator').innerHTML = '<span class="online-dot"></span>Saved on this device';
    render();
    return true;
  } catch {
    storageWarning('This change could not be saved. Your inventory has been kept as it was. Check browser storage permissions or space, and export a backup.');
    notify('Could not save the change.');
    return false;
  }
}
function render() {
  const categories = [...new Set([...CATEGORIES, ...state.parts.map(part => part.category)])];
  if (state.category && !categories.includes(state.category)) state.category = '';
  const lowCount = state.parts.filter(part => stockState(part) !== 'in').length;
  const usedCategories = new Set(state.parts.map(part => part.category)).size;
  $('#all-count').textContent = format(state.parts.length);
  $('#low-count').textContent = format(lowCount);
  $('#category-count').textContent = usedCategories;
  $('#stat-types').textContent = format(state.parts.length);
  $('#stat-total').textContent = format(state.parts.reduce((sum, part) => sum + part.quantity, 0));
  $('#stat-low').textContent = format(lowCount);
  $('#stat-categories').textContent = usedCategories;
  $('#all-parts').classList.toggle('active', !state.category && !state.lowOnly);
  $('#low-stock').classList.toggle('active', state.lowOnly);
  $('#all-parts').setAttribute('aria-pressed', String(!state.category && !state.lowOnly));
  $('#low-stock').setAttribute('aria-pressed', String(state.lowOnly));
  const counts = new Map();
  state.parts.forEach(part => counts.set(part.category, (counts.get(part.category) || 0) + 1));
  $('#category-nav').innerHTML = categories.map(category => `<button class="nav-item category-nav-item ${state.category === category && !state.lowOnly ? 'active' : ''}" data-category="${escape(category)}" aria-pressed="${state.category === category && !state.lowOnly}"><span class="category-dot" style="--dot-color:${(looks[category] || looks.Other)[3]}"></span><span class="category-name">${escape(category)}</span><span class="nav-count">${counts.get(category) || 0}</span></button>`).join('');
  $('#category-filter').innerHTML = '<option value="">All categories</option>' + categories.map(category => `<option value="${escape(category)}">${escape(category)}</option>`).join('');
  $('#category-filter').value = state.category;
  $('#categories').innerHTML = categories.map(category => `<option value="${escape(category)}"></option>`).join('');
  const visible = selectParts(state.parts, state);
  const heading = state.lowOnly ? 'Low stock' : state.category || 'All parts';
  $('#inventory-title').innerHTML = `${escape(heading)} <span>${format(visible.length)}</span>`;
  $('#inventory-subtitle').textContent = state.lowOnly ? 'A quick look at what needs restocking.' : 'Your collection, neatly accounted for.';
  $('#empty-state').hidden = state.parts.length !== 0;
  $('#no-results').hidden = !state.parts.length || visible.length > 0;
  $('#table-container').hidden = visible.length === 0;
  $('#export-button').disabled = state.parts.length === 0;
  $('#showing-count').textContent = state.parts.length === 0 ? '0 parts in your inventory' : `Showing ${format(visible.length)} of ${format(state.parts.length)} part types`;
  $('#parts-body').innerHTML = visible.map(part => {
    const look = looks[part.category] || looks.Other;
    const status = stockState(part);
    return `<tr data-id="${escape(part.id)}" style="--symbol-bg:${look[1]};--symbol-color:${look[2]}"><td><div class="part-cell"><span class="part-symbol">${icons(look[0])}</span><div><span class="part-name">${escape(part.name)}</span><div class="part-spec">${escape([part.specification, part.partNumber].filter(Boolean).join(' · ') || 'No specification')}</div></div></div></td><td><span class="category-badge" title="${escape(part.category)}">${escape(part.category)}</span></td><td class="location-cell" title="${escape(part.location)}">${escape(part.location || '—')}</td><td><div class="quantity-control"><button data-action="decrease" aria-label="Use one ${escape(part.name)}" ${part.quantity === 0 ? 'disabled' : ''}>−</button><span>${format(part.quantity)}</span><button data-action="increase" aria-label="Add one ${escape(part.name)}" ${part.quantity === 999999 ? 'disabled' : ''}>+</button></div></td><td><span class="stock-badge stock-${status}">${status === 'out' ? 'Out of stock' : status === 'low' ? 'Low stock' : 'In stock'}</span></td><td><button class="icon-button" data-action="edit" aria-label="Edit ${escape(part.name)}">${icons('edit')}</button></td></tr>`;
  }).join('');
}
function openPart(part = null) {
  state.editing = part?.id || null;
  const form = $('#part-form');
  form.reset();
  const defaults = { name: '', category: state.category || 'Resistors', partNumber: '', specification: '', quantity: 1, minimum: 0, location: '', notes: '' };
  for (const [key, value] of Object.entries(part || defaults)) {
    if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
  }
  $('#dialog-title').textContent = part ? 'Edit part' : 'Add a part';
  $('#save-part').textContent = part ? 'Save changes' : 'Add part';
  $('#delete-part').hidden = !part;
  $('#form-error').hidden = true;
  $('#part-dialog').showModal();
  form.elements.namedItem('name').focus();
}
$('#add-part').addEventListener('click', () => openPart());
$('#empty-add').addEventListener('click', () => openPart());
$('#close-dialog').addEventListener('click', () => $('#part-dialog').close());
$('#cancel-dialog').addEventListener('click', () => $('#part-dialog').close());
$('#part-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const part = normalizePart({ ...fields, id: state.editing || crypto.randomUUID(), quantity: Number(fields.quantity), minimum: Number(fields.minimum) });
    const editing = Boolean(state.editing);
    if (!editing && state.parts.length >= MAX_PARTS) throw new Error('Your inventory is full. Export a backup before removing unused parts.');
    const parts = editing ? state.parts.map(item => item.id === part.id ? part : item) : [...state.parts, part];
    if (commit(parts)) { $('#part-dialog').close(); notify(editing ? 'Part updated.' : 'Part added to your inventory.'); }
    else { $('#form-error').textContent = 'Could not save. Check browser storage permissions or space, then try again.'; $('#form-error').hidden = false; }
  } catch (error) {
    $('#form-error').textContent = error.message;
    $('#form-error').hidden = false;
  }
});
$('#parts-body').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('tr').dataset.id;
  const part = state.parts.find(item => item.id === id);
  if (!part) return;
  if (button.dataset.action === 'edit') { openPart(part); return; }
  const quantity = part.quantity + (button.dataset.action === 'increase' ? 1 : -1);
  if (quantity < 0 || quantity > 999999) return;
  if (commit(state.parts.map(item => item.id === id ? { ...item, quantity } : item))) {
    // Keep keyboard focus on the same control after the row updates.
    const row = [...$('#parts-body').rows].find(item => item.dataset.id === id);
    row?.querySelector(`[data-action="${button.dataset.action}"]`)?.focus({ preventScroll: true });
    notify(`${part.name}: ${format(quantity)} in stock.`);
  }
});
$('#delete-part').addEventListener('click', () => {
  const part = state.parts.find(item => item.id === state.editing);
  if (!part) return;
  $('#delete-description').textContent = `“${part.name}” and its quantity will be removed from your inventory. This cannot be undone.`;
  $('#delete-dialog').showModal();
  $('#cancel-delete').focus();
});
$('#cancel-delete').addEventListener('click', () => $('#delete-dialog').close());
$('#confirm-delete').addEventListener('click', () => {
  if (commit(state.parts.filter(item => item.id !== state.editing))) {
    $('#delete-dialog').close(); $('#part-dialog').close(); notify('Part deleted.');
  }
});
function resetView() { state.category = ''; state.lowOnly = false; state.query = ''; $('#search').value = ''; render(); }
$('#all-parts').addEventListener('click', resetView);
$('#low-stock').addEventListener('click', () => { state.category = ''; state.lowOnly = true; render(); });
$('#clear-filters').addEventListener('click', resetView);
$('#category-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (button) { state.category = button.dataset.category; state.lowOnly = false; render(); }
});
$('#category-filter').addEventListener('change', event => { state.category = event.target.value; render(); });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; render(); });
$('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input,textarea,select,dialog')) {
    event.preventDefault(); $('#search').focus();
  }
});
$('#sample-button').addEventListener('click', () => {
  if (!state.parts.length && commit(sampleParts())) { resetView(); notify('Sample parts added. You can edit or delete them anytime.'); }
});
$('#export-button').addEventListener('click', () => {
  const backup = { app: 'PartsVault', version: 1, exportedAt: new Date().toISOString(), parts: state.parts };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `partsvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Inventory backup downloaded.');
});
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('This backup is too large. Choose a file smaller than 30 MB.');
    const incoming = parseInventory(await file.text());
    if (!incoming.length) { notify('This backup contains no parts. Nothing changed.'); return; }
    if (commit(mergeInventory(state.parts, incoming), true)) {
      resetView(); notify(`Imported ${format(incoming.length)} part types. Matching IDs were updated; other parts were kept.`);
    }
  } catch (error) { notify(error.message); }
  finally { event.target.value = ''; }
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    state.parts = value === null ? [] : parseInventory(value);
    state.storageReady = true;
    $('#storage-warning').hidden = true;
    $('#save-indicator').innerHTML = '<span class="online-dot"></span>Saved on this device';
    if ($('#part-dialog').open) { $('#delete-dialog').close(); $('#part-dialog').close(); }
    render(); notify('Inventory updated from another tab.');
  } catch {
    state.storageReady = false;
    storageWarning('Saved data changed in another tab but could not be read. Export your current inventory and reload before making changes.');
  }
});
render();
