export const STORAGE_KEY = 'partsvault.inventory.v1';
export const CATEGORIES = ['Resistors', 'Capacitors', 'Semiconductors', 'ICs & modules', 'Connectors', 'Sensors', 'Other'];
export const MAX_PARTS = 10000;

function field(value, name, limit, required = false) {
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
    throw new Error(`${name} must be ${required ? 'nonempty text' : 'text'} with at most ${limit} characters.`);
  }
  return value.trim();
}
export function normalizePart(part) {
  if (!part || typeof part !== 'object' || Array.isArray(part)) throw new Error('Each part must be an object.');
  for (const name of ['quantity', 'minimum']) {
    if (!Number.isSafeInteger(part[name]) || part[name] < 0 || part[name] > 999999) {
      throw new Error(`${name === 'minimum' ? 'Low-stock threshold' : 'Quantity'} must be a whole number from 0 to 999,999.`);
    }
  }
  return {
    id: field(part.id, 'Part ID', 100, true),
    name: field(part.name, 'Part name', 120, true),
    category: field(part.category, 'Category', 60, true),
    quantity: part.quantity,
    minimum: part.minimum,
    partNumber: field(part.partNumber ?? '', 'Part number', 120),
    specification: field(part.specification ?? '', 'Specification', 160),
    location: field(part.location ?? '', 'Location', 120),
    notes: field(part.notes ?? '', 'Notes', 2000),
  };
}
export function parseInventory(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose a PartsVault backup.'); }
  const parts = Array.isArray(data) ? data : data?.parts;
  if (!Array.isArray(parts) || parts.length > MAX_PARTS) throw new Error(`A backup must contain a parts array with at most ${MAX_PARTS.toLocaleString()} entries.`);
  const normalized = parts.map(normalizePart);
  if (new Set(normalized.map(part => part.id)).size !== normalized.length) throw new Error('The backup contains duplicate part IDs.');
  return normalized;
}
export function mergeInventory(current, incoming) {
  const merged = new Map(current.map(part => [part.id, part]));
  incoming.forEach(part => merged.set(part.id, part));
  if (merged.size > MAX_PARTS) throw new Error(`Your inventory can hold up to ${MAX_PARTS.toLocaleString()} part types.`);
  return [...merged.values()];
}
export function stockState(part) {
  return part.quantity === 0 ? 'out' : part.minimum > 0 && part.quantity <= part.minimum ? 'low' : 'in';
}
export function selectParts(parts, { query = '', category = '', lowOnly = false, sort = 'name' } = {}) {
  const search = query.toLocaleLowerCase().trim();
  return parts.filter(part => (!category || part.category === category)
    && (!lowOnly || stockState(part) !== 'in')
    && (!search || [part.name, part.partNumber, part.specification, part.location, part.category, part.notes].some(value => value.toLocaleLowerCase().includes(search))))
    .sort((a, b) => sort === 'quantity' ? a.quantity - b.quantity || a.name.localeCompare(b.name)
      : sort === 'category' ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name, undefined, { numeric: true }));
}
export function sampleParts() {
  return [
    ['220 Ω resistor', 'Resistors', 120, 20, '1/4 W · ±5%', 'Drawer A1', 'CFR-25-220R'],
    ['10 kΩ resistor', 'Resistors', 85, 20, '1/4 W · ±5%', 'Drawer A2', 'CFR-25-10K'],
    ['100 µF capacitor', 'Capacitors', 24, 10, 'Electrolytic · 25 V', 'Drawer B1', ''],
    ['100 nF capacitor', 'Capacitors', 48, 10, 'Ceramic · 50 V', 'Drawer B2', ''],
    ['Arduino Nano', 'ICs & modules', 3, 2, 'ATmega328P · 5 V', 'Bin C1', 'A000005'],
    ['Red LED', 'Semiconductors', 8, 10, '5 mm · 2 V', 'Drawer A4', ''],
    ['BME280 sensor', 'Sensors', 2, 3, 'Temperature · humidity · pressure', 'Bin C2', 'BME280'],
    ['Male header pins', 'Connectors', 0, 5, '2.54 mm · 40 pin', 'Drawer D1', ''],
  ].map(([name, category, quantity, minimum, specification, location, partNumber], index) => ({
    id: `sample-${index}`, name, category, quantity, minimum, specification, location, partNumber, notes: '',
  }));
}
