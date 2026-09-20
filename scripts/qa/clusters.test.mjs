// Unit tests for public/map-clusters.js (the pure part of the marker pass).
// Run: npm test   (node --test scripts/qa/)
//
// The module is a classic browser script that assigns window.SDLClusters, so
// it is evaluated here in a vm sandbox with a fake `window`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../public/map-clusters.js', import.meta.url), 'utf8');
const ctx = { Math, Infinity, console };
ctx.window = ctx;
vm.createContext(ctx);
new vm.Script(src, { filename: 'map-clusters.js' }).runInContext(ctx);
const C = ctx.SDLClusters;

// Two Boston-area points ~1 km apart, Cambridge UK, Tokyo.
const PTS = [
  { id: 'a', lat: 42.36, lon: -71.06 },
  { id: 'b', lat: 42.37, lon: -71.06 },
  { id: 'c', lat: 52.20, lon: 0.12 },
  { id: 'd', lat: 35.68, lon: 139.69 },
];

test('module exposes the documented API', () => {
  for (const fn of ['buildHierarchy', 'cut', 'tightRoot', 'thresholdKm', 'deadBand', 'discDiameterCss', 'pinRadiusCss', 'labelBudget', 'easeOutCubic', 'gcKm'])
    assert.equal(typeof C[fn], 'function', fn);
});

test('great-circle distance', () => {
  const km = C.gcKm(PTS[0], PTS[1]);
  assert.ok(km > 1.0 && km < 1.3, `expected ~1.1 km, got ${km}`);
  assert.ok(Math.abs(C.gcKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111.2) < 0.5);
});

test('buildHierarchy: root spans all points, leaves keep ids, merge distances increase upward', () => {
  const t = C.buildHierarchy(PTS);
  assert.equal(t.root.n, 4);
  assert.equal(t.leaves.length, 4);
  assert.deepEqual([...t.root.members].sort(), ['a', 'b', 'c', 'd']);
  for (const leaf of t.leaves) assert.equal(leaf.mergeKm, 0);
  // Boston pair merges first, at ~1 km.
  const boston = t.byId.get('a').parent;
  assert.ok(boston.mergeKm < 2, `boston mergeKm ${boston.mergeKm}`);
  assert.deepEqual([...boston.members].sort(), ['a', 'b']);
  // Every internal node merges at a distance ≥ its children's merge distances.
  const walk = (n) => { if (!n.children) return; for (const c of n.children) { assert.ok(n.mergeKm >= c.mergeKm); walk(c); } };
  walk(t.root);
});

test('cut: threshold picks the display set; leaves emitted when their parent split is wider than the threshold', () => {
  const t = C.buildHierarchy(PTS);
  // Array.from: the module's arrays come from the vm realm; strict deepEqual checks prototypes.
  const ids = (nodes) => Array.from(nodes, (n) => [...n.members].sort().join('+')).sort();
  assert.deepEqual(ids(C.cut(t, 0.5)), ['a', 'b', 'c', 'd']);        // below 1 km: everything apart
  assert.deepEqual(ids(C.cut(t, 5)), ['a+b', 'c', 'd']);              // Boston pair merged
  assert.deepEqual(ids(C.cut(t, 500)), ['a+b', 'c', 'd']);            // still 3: nothing else within 500 km
  assert.deepEqual(ids(C.cut(t, 20000)), ['a+b+c+d']);                // one disc
  // Each displayed node carries a centroid.
  for (const n of C.cut(t, 5)) { assert.equal(typeof n.lat, 'number'); assert.equal(typeof n.lon, 'number'); }
});

test('cut with spiderKm: tight groups split early; tightRoot finds the group', () => {
  const t = C.buildHierarchy(PTS);
  const ids = (nodes) => Array.from(nodes, (n) => [...n.members].sort().join('+')).sort();
  assert.deepEqual(ids(C.cut(t, 6, 5)), ['a+b', 'c', 'd']);   // threshold above spiderKm: still merged
  assert.deepEqual(ids(C.cut(t, 2, 5)), ['a', 'b', 'c', 'd']); // below spiderKm: forced apart (1.1 km pair would merge at 2 km without spider)
  assert.deepEqual(ids(C.cut(t, 2, 0)), ['a+b', 'c', 'd']);     // same threshold, no spider: still merged
  assert.deepEqual(ids(C.cut(t, 4.9, 5)), ['a', 'b', 'c', 'd']); // with spider 5 km, a 4.9 threshold splits the tight pair
  const a = t.byId.get('a'), c = t.byId.get('c');
  assert.equal(C.tightRoot(a, 5), a.parent);        // the Boston pair node
  assert.equal(C.tightRoot(a, 0.5), a);             // nothing is tight at 0.5 km
  assert.equal(C.tightRoot(c, 5), c);               // Cambridge stands alone
});

test('cut on a single point and on an empty set', () => {
  const one = C.buildHierarchy([PTS[0]]);
  assert.equal(C.cut(one, 100).length, 1);
  const none = C.buildHierarchy([]);
  assert.equal(C.cut(none, 100).length, 0);
});

test('thresholdKm and deadBand', () => {
  assert.equal(C.thresholdKm(28, 0.5), 56);
  assert.equal(C.deadBand(100, 104), 100);   // < 6 % change: keep previous
  assert.equal(C.deadBand(100, 110), 110);   // ≥ 6 %: take the new value
  assert.equal(C.deadBand(null, 42), 42);    // first frame
  assert.equal(C.deadBand(100, 104, 0.02), 104);
});

test('size laws', () => {
  assert.ok(Math.abs(C.discDiameterCss(2, false) - 26.4) < 1e-9);
  assert.ok(Math.abs(C.discDiameterCss(20, false) - 48) < 1e-9);
  assert.equal(C.discDiameterCss(50, false), C.discDiameterCss(20, false)); // capped
  assert.equal(C.discDiameterCss(2, true), C.discDiameterCss(2, false) + 2);
  assert.equal(C.pinRadiusCss(false, false), 5);
  assert.equal(C.pinRadiusCss(true, false), 6.5);
  assert.ok(Math.abs(C.pinRadiusCss(true, true) - 8.45) < 1e-9);
});

test('label budget: zero at world zoom on touch, area-capped otherwise', () => {
  assert.equal(C.labelBudget(390 * 696, 1.0, true), 0);
  assert.equal(C.labelBudget(390 * 696, 2.0, true), 4);
  assert.equal(C.labelBudget(390 * 696, 3.0, true), 6);   // area budget 6 caps the ladder's 8
  assert.equal(C.labelBudget(390 * 696, 5.5, true), 6);
  assert.equal(C.labelBudget(1440 * 702, 5.5, false), 28);
  assert.equal(C.labelBudget(1440 * 702, 1.0, false), 12);
});

test('easeOutCubic endpoints and monotonicity', () => {
  assert.equal(C.easeOutCubic(0), 0);
  assert.equal(C.easeOutCubic(1), 1);
  let prev = 0;
  for (let t = 0; t <= 1.0001; t += 0.05) { const v = C.easeOutCubic(Math.min(1, t)); assert.ok(v >= prev); prev = v; }
});
