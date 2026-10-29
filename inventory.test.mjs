import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePart, parseInventory, mergeInventory, stockState, selectParts, sampleParts } from './inventory.mjs';

const part = (overrides = {}) => ({ id: 'test-1', name: '10 kΩ resistor', category: 'Resistors', quantity: 20, minimum: 5, specification: '1/4 W', location: 'Drawer A1', notes: '', partNumber: '', ...overrides });

test('backups round-trip Unicode, notes, and zero stock without losing data', () => {
  const parts = [part({ notes: '<spare> & “tested”', quantity: 0 }), part({ id: 'test-2', name: '100 µF capacitor' })];
  assert.deepEqual(parseInventory(JSON.stringify({ version: 1, parts })), parts);
});
test('invalid imports reject the full backup, including duplicate IDs', () => {
  for (const input of ['bad JSON', '{}', JSON.stringify([part(), part()]), JSON.stringify([part(), part({ id: 'bad', quantity: -1 })])]) {
    assert.throws(() => parseInventory(input));
  }
});
test('part validation rejects negative, fractional, excessive, and missing quantities and blank names', () => {
  for (const quantity of [-1, 1.2, 1000000, null, '20', NaN]) assert.throws(() => normalizePart(part({ quantity })));
  assert.throws(() => normalizePart(part({ name: '   ' })));
  assert.throws(() => normalizePart(part({ minimum: -1 })));
  assert.throws(() => normalizePart(part({ category: [] })));
});
test('import updates matching IDs and preserves unrelated inventory', () => {
  const current = [part(), part({ id: 'keep', name: 'LED' })];
  const incoming = [part({ quantity: 50 }), part({ id: 'new' })];
  const result = mergeInventory(current, incoming);
  assert.equal(result.length, 3);
  assert.equal(result.find(item => item.id === 'test-1').quantity, 50);
  assert.equal(result.find(item => item.id === 'keep').name, 'LED');
  assert.equal(current[0].quantity, 20);
});
test('stock thresholds include the boundary, disable at zero, and detect out of stock', () => {
  assert.equal(stockState(part({ quantity: 5 })), 'low');
  assert.equal(stockState(part({ quantity: 6 })), 'in');
  assert.equal(stockState(part({ quantity: 1, minimum: 0 })), 'in');
  assert.equal(stockState(part({ quantity: 0, minimum: 0 })), 'out');
});
test('search covers values, notes, and locations; filters combine without mutating inventory', () => {
  const parts = sampleParts();
  assert.equal(selectParts(parts, { query: 'DRAWER A1' }).length, 1);
  assert.equal(selectParts(parts, { query: '25 V' }).length, 1);
  assert.equal(selectParts([part({ notes: 'breadboard spare' })], { query: 'breadboard' }).length, 1);
  assert.equal(selectParts(parts, { category: 'Semiconductors', lowOnly: true }).length, 1);
  assert.equal(selectParts(parts, { category: 'Resistors', lowOnly: true }).length, 0);
  assert.equal(selectParts(parts, { sort: 'quantity' })[0].quantity, 0);
  assert.equal(parts[0].name, '220 Ω resistor');
});
