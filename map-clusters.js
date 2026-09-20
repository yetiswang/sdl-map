/* SDLClusters — the pure geometry behind the marker pass in map-legacy.html.
 *
 * Why a separate file: the render loop in map-legacy.html is 5k lines of
 * DOM and projection plumbing. Everything here is data-in, data-out, so it
 * can be unit-tested in Node (scripts/qa/clusters.test.mjs, `npm test`) and
 * reasoned about without a browser.
 *
 * Model (2026-09-20 redesign, plan in the vault: 30-Projects/SDL-Map/):
 *  - buildHierarchy(points) runs ONCE: agglomerative clustering on great-
 *    circle distance with centroid linkage. n ≈ 120 → a few ms.
 *  - cut(tree, thresholdKm) runs per frame: the displayed set is the tree
 *    cut at a distance that corresponds to ~28 CSS px at the current zoom.
 *    Zooming in lowers the threshold, so clusters split one merge at a time
 *    (never en masse), and the same leaf/cluster objects persist between
 *    frames — which is what lets the map animate a split instead of popping.
 *  - deadBand() stops the cut flickering on micro-zoom jitter.
 *  - discDiameterCss / pinRadiusCss / labelBudget are the ONE size law and
 *    the ONE label law. No investment sizing, no zoom bell curve, no
 *    per-frame force push.
 *
 * Classic script (no modules) so the iframe can <script src> it; in Node the
 * tests evaluate it in a vm sandbox with a fake window.
 */
(function (root) {
  'use strict';
  var R_KM = 6371.0088;
  var D2R = Math.PI / 180;

  function gcKm(a, b) {
    var la1 = a.lat * D2R, la2 = b.lat * D2R;
    var dLat = la2 - la1, dLon = (b.lon - a.lon) * D2R;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Weighted centroid on the unit sphere (so a Tokyo+Boston pair does not
  // land in the Pacific through naive lat/lon averaging).
  function centroid(a, b) {
    var la1 = a.lat * D2R, lo1 = a.lon * D2R, la2 = b.lat * D2R, lo2 = b.lon * D2R;
    var wa = a.n, wb = b.n;
    var x = wa * Math.cos(la1) * Math.cos(lo1) + wb * Math.cos(la2) * Math.cos(lo2);
    var y = wa * Math.cos(la1) * Math.sin(lo1) + wb * Math.cos(la2) * Math.sin(lo2);
    var z = wa * Math.sin(la1) + wb * Math.sin(la2);
    var hyp = Math.sqrt(x * x + y * y);
    return { lat: Math.atan2(z, hyp) / D2R, lon: Math.atan2(y, x) / D2R };
  }

  function buildHierarchy(points) {
    var leaves = points.map(function (p) {
      return { id: p.id, lat: p.lat, lon: p.lon, n: 1, members: [p.id], children: null, mergeKm: 0, parent: null, entry: p, depth: 0 };
    });
    var byId = new Map();
    leaves.forEach(function (l) { byId.set(l.id, l); });
    var nodes = [];
    if (!leaves.length) return { root: null, leaves: leaves, byId: byId, nodes: nodes };
    var active = leaves.slice();
    var seq = 0;
    while (active.length > 1) {
      var bi = 0, bj = 1, bd = Infinity;
      for (var i = 0; i < active.length; i++) {
        for (var j = i + 1; j < active.length; j++) {
          var d = gcKm(active[i], active[j]);
          if (d < bd) { bd = d; bi = i; bj = j; }
        }
      }
      var a = active[bi], b = active[bj];
      var c = centroid(a, b);
      var node = {
        id: 'c' + (seq++), lat: c.lat, lon: c.lon, n: a.n + b.n,
        members: a.members.concat(b.members), children: [a, b],
        // Centroid linkage can produce inversions; clamp so the cut is a
        // well-defined monotone function of the threshold.
        mergeKm: Math.max(bd, a.mergeKm, b.mergeKm),
        parent: null, entry: null, depth: 0
      };
      a.parent = node; b.parent = node;
      active.splice(bj, 1); active.splice(bi, 1); active.push(node);
      nodes.push(node);
      byId.set(node.id, node);
    }
    var rootNode = active[0];
    // Depth from the root, handy for deterministic z-order.
    (function mark(n, depth) { n.depth = depth; if (n.children) { mark(n.children[0], depth + 1); mark(n.children[1], depth + 1); } })(rootNode, 0);
    return { root: rootNode, leaves: leaves, byId: byId, nodes: nodes };
  }

  // Displayed nodes for a threshold: descend from the root while a node's
  // internal merge distance exceeds the threshold; emit it when its members
  // are all closer than the threshold (leaves always are).
  //
  // spiderKm (optional): pins closer than this can never be separated by
  // zoom alone on the current device (at max zoom they are still a few px
  // apart), so a "tight" group — every merge below spiderKm — splits as soon
  // as the threshold drops below spiderKm, and the caller fans its leaves out
  // on a ring around the group centroid (see tightRoot).
  function effMerge(n, spiderKm) { return (spiderKm && n.mergeKm < spiderKm) ? spiderKm : n.mergeKm; }
  function cut(tree, thresholdKm, spiderKm) {
    var out = [];
    if (!tree || !tree.root) return out;
    var stack = [tree.root];
    while (stack.length) {
      var n = stack.pop();
      if (!n.children || effMerge(n, spiderKm) <= thresholdKm) { out.push(n); continue; }
      stack.push(n.children[0], n.children[1]);
    }
    return out;
  }

  // Topmost ancestor whose merge distance is below spiderKm (the tight group
  // this node belongs to); the node itself when it is not in a tight group.
  function tightRoot(node, spiderKm) {
    var r = node;
    while (r.parent && r.parent.mergeKm < spiderKm) r = r.parent;
    return r;
  }

  function thresholdKm(radiusCssPx, pxPerKm) { return radiusCssPx / pxPerKm; }

  function deadBand(prev, next, frac) {
    if (frac == null) frac = 0.06;
    if (prev == null || !isFinite(prev) || prev <= 0) return next;
    return Math.abs(next - prev) / prev < frac ? prev : next;
  }

  // Cluster disc: density carried by SIZE (zhiyan rule), capped at 20 so a
  // 40-member Boston does not eat the north-east. Kept under the cut radius
  // (2 × 30/36 px) for most n so neighbouring discs rarely touch; the render
  // pass relaxes the few that do.
  function discDiameterCss(n, isTouch) { return 24 + 1.2 * Math.min(n, 20) + (isTouch ? 2 : 0); }

  // Leaf pin: constant per device; ×1.3 when highlighted by a filter.
  function pinRadiusCss(isTouch, hl) { return (isTouch ? 6.5 : 5) * (hl ? 1.3 : 1); }

  // How many names may be on screen: one per ~36k CSS px² (42k on touch),
  // clamped 6..28, with a lower ladder at far zoom where names are noise.
  function labelBudget(areaCssPx, k, isTouch) {
    var b = Math.max(6, Math.min(28, Math.round(areaCssPx / (isTouch ? 42000 : 36000))));
    if (isTouch) {
      if (k < 1.5) return 0;
      if (k < 2.5) return Math.min(4, b);
      if (k < 4.0) return Math.min(8, b);
      return b;
    }
    if (k < 1.5) return Math.min(12, b);
    if (k < 2.5) return Math.min(18, b);
    return b;
  }

  function easeOutCubic(t) { var u = 1 - t; return 1 - u * u * u; }

  root.SDLClusters = {
    gcKm: gcKm, buildHierarchy: buildHierarchy, cut: cut, tightRoot: tightRoot, thresholdKm: thresholdKm,
    deadBand: deadBand, discDiameterCss: discDiameterCss, pinRadiusCss: pinRadiusCss,
    labelBudget: labelBudget, easeOutCubic: easeOutCubic
  };
})(typeof window !== 'undefined' ? window : this);
