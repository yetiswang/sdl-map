/* v46 — Map export for map-legacy.html.
   Renders a clean standalone flat-projection SVG of the CURRENTLY FILTERED
   entries (all sidebar groups incl. Country), then downloads it as SVG, or
   rasterises it to PNG / JPEG, or wraps the JPEG in a minimal hand-built
   one-page PDF. No external libraries beyond the already-vendored d3.

   Reads from map-legacy.html:
     window.SDL_DATA / SDL_CATEGORIES      dataset + filter groups
     window.__sdlGetFiltered()             entries passing the live filters
     window.__sdlExportGeo                 land / border features (topojson)
   Colours are resolved from tokens.css at export time (per theme) and
   hexified so the SVG stays valid outside the browser. */
(function () {
  'use strict';

  var W = 1600, H = 1000;                    // export canvas, px
  var RASTER_SCALE = 2;                      // PNG/JPEG at 3200×2000

  function investRadius(inv) {               // same curve as the live map
    if (!inv || inv <= 0) return 4.5;
    return 4 + Math.min(11, Math.sqrt(inv) / 3.5);
  }

  // ---- token resolution (exact site palette, hexified via canvas) --------
  function resolveTokens(theme) {
    var root = document.documentElement;
    var prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', theme);
    var cs = getComputedStyle(root);
    function gv(n) { return cs.getPropertyValue(n).trim(); }
    var raw = {
      bg: gv('--bg'),
      // Light exports read like a print map: pale sea (bg-2), defined land.
      // Dark keeps the globe's deep ocean shade.
      ocean: theme === 'light' ? (gv('--bg-2') || gv('--globe-gradient-end')) : (gv('--globe-gradient-end') || gv('--bg-2')),
      land: gv('--land'), landEdge: gv('--land-edge'),
      graticule: gv('--graticule'), rule: gv('--rule'),
      ink: gv('--ink'), ink2: gv('--ink-2'), ink3: gv('--ink-3'),
      national: gv('--c-national'), academic: gv('--c-academic'),
      commercial: gv('--c-commercial'), labos: gv('--c-labos'),
    };
    if (prev) root.setAttribute('data-theme', prev); else root.removeAttribute('data-theme');
    var c = document.createElement('canvas'); c.width = c.height = 1;
    var x = c.getContext('2d', { willReadFrequently: true });
    function hex(v) {
      if (!v) return '#888888';
      x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = v;
      x.fillRect(0, 0, 1, 1);
      var d = x.getImageData(0, 0, 1, 1).data;
      return '#' + [d[0], d[1], d[2]].map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    var out = {};
    Object.keys(raw).forEach(function (k) { out[k] = hex(raw[k]); });
    return out;
  }

  // ---- SVG assembly ------------------------------------------------------
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var SANS = "'Inter','Helvetica Neue',Arial,sans-serif";
  var MONO = "'IBM Plex Mono',Menlo,Consolas,monospace";

  // Crop the viewport to the selection: pad the pins' geographic bbox
  // (never tighter than ~4°×3° so a single lab still gets country context),
  // fit to it, and only clamp against street-level absurdity.
  function makeProjection(entries) {
    var worldScale = d3.geoNaturalEarth1().fitExtent([[40, 110], [W - 40, H - 130]], { type: 'Sphere' }).scale();
    var lons = entries.map(function (d) { return d.lon; });
    var lats = entries.map(function (d) { return d.lat; });
    var minLon = Math.min.apply(null, lons), maxLon = Math.max.apply(null, lons);
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var padLon = Math.max((maxLon - minLon) * 0.18, 2.0);
    var padLat = Math.max((maxLat - minLat) * 0.18, 1.5);
    // MultiPoint (pins + padded bbox corners) — a spherical Polygon here is a
    // winding-order trap: wound the wrong way it means "the world minus the
    // box" and the fit silently degrades to a whole-world view.
    var lo1 = Math.max(-179.9, minLon - padLon), lo2 = Math.min(179.9, maxLon + padLon);
    var la1 = Math.max(-84, minLat - padLat), la2 = Math.min(84, maxLat + padLat);
    var box = {
      type: 'MultiPoint',
      coordinates: entries.map(function (d) { return [d.lon, d.lat]; })
        .concat([[lo1, la1], [lo2, la1], [lo2, la2], [lo1, la2]]),
    };
    var proj = d3.geoNaturalEarth1().fitExtent([[70, 150], [W - 70, H - 160]], box);
    if (!isFinite(proj.scale()) || proj.scale() < worldScale) {
      proj = d3.geoNaturalEarth1().fitExtent([[40, 110], [W - 40, H - 130]], { type: 'Sphere' });
    }
    var maxScale = worldScale * 60;
    if (proj.scale() > maxScale) {
      var keep = maxScale / proj.scale();
      var t = proj.translate(), c = [W / 2, H * 0.53];
      proj.scale(maxScale).translate([c[0] + (t[0] - c[0]) * keep, c[1] + (t[1] - c[1]) * keep]);
    }
    return { proj: proj, zoom: proj.scale() / worldScale };
  }

  // High-resolution geometry (50m world atlas) for cropped exports; the live
  // map keeps the light 110m file. Same-origin, fetched once on demand.
  var _geo50 = null;
  function hiResGeo() {
    if (_geo50) return _geo50;
    _geo50 = fetch('/vendor/countries-50m.json')
      .then(function (r) { return r.json(); })
      .then(function (w) {
        // d3-geo fills spherical polygons: a ring wound the wrong way means
        // "everything except this shape" and paints the oceans as land.
        // Rewind any polygon that claims more than half the sphere.
        function rewind(f) {
          // topojson.feature returns a Feature OR (for a GeometryCollection
          // object, as world-atlas 'land' is) a FeatureCollection.
          (f.features || [f]).forEach(function (feat) {
            var geom = feat.geometry;
            var polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
            polys.forEach(function (rings) {
              if (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) {
                rings.forEach(function (r) { r.reverse(); });
              }
            });
          });
          return f;
        }
        return {
          land: rewind(topojson.feature(w, w.objects.land)),
          mesh: topojson.mesh(w, w.objects.countries, function (a, b) { return a !== b; }),
          outer: topojson.mesh(w, w.objects.countries, function (a, b) { return a === b; }),
        };
      })
      .catch(function () { return null; });
    return _geo50;
  }

  // Adaptive title from the active filter state, e.g.
  // "SDL Landscape: Academic institutions in the Netherlands".
  var TIER_NATURAL = {
    national: 'National programmes & consortia',
    academic: 'Academic institutions',
    commercial: 'Commercial & industrial platforms',
    labos: 'Lab OS & orchestration platforms',
  };
  var THE_COUNTRIES = { Netherlands: 1, UK: 1, USA: 1, EU: 1 };
  function joinNatural(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' & ' + arr[arr.length - 1];
  }
  function exportTitle() {
    var f = window.__sdlGetFilters ? window.__sdlGetFilters() : {};
    var CATS = window.SDL_CATEGORIES;
    function labels(group, ids) {
      return (ids || []).map(function (id) {
        var o = (CATS[group] && CATS[group].options.find(function (x) { return x.id === id; }));
        return o ? o.label : id;
      });
    }
    var parts = [];
    if (f.tier && f.tier.length && f.tier.length <= 2) {
      parts.push(joinNatural(f.tier.map(function (t) { return TIER_NATURAL[t] || t; })));
    }
    if (f.domain && f.domain.length && f.domain.length <= 2) parts.push(joinNatural(labels('domain', f.domain)));
    if (f.maturity && f.maturity.length && f.maturity.length <= 2) parts.push(joinNatural(labels('maturity', f.maturity)).toLowerCase());
    if (f.charact && f.charact.length === 1) parts.push(labels('charact', f.charact)[0].toLowerCase() + ' characterisation');
    var suffix = '';
    if (f.country && f.country.length) {
      var cs = f.country.map(function (c) { return (THE_COUNTRIES[c] ? 'the ' : '') + c; });
      suffix = ' in ' + (cs.length <= 3 ? joinNatural(cs) : f.country.length + ' countries');
    }
    if (!parts.length && !suffix) return 'Global Self-Driving Lab Landscape';
    var head = parts.length ? parts.join(' · ') : 'Self-driving labs';
    var title = 'SDL Landscape: ' + head + suffix;
    return title.length > 95 ? 'SDL Landscape: filtered selection' + suffix : title;
  }

  function buildExportSVG(entries, theme, fontCSS, fit, geoOverride) {
    var pal = resolveTokens(theme);
    var geo = geoOverride || window.__sdlExportGeo;
    var CATS = window.SDL_CATEGORIES;
    var proj = fit.proj;
    var path = d3.geoPath(proj);
    var gratStep = fit.zoom > 20 ? 2.5 : fit.zoom > 8 ? 5 : 15;
    var grat = d3.geoGraticule().step([gratStep, gratStep]);

    var s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">');
    if (fontCSS) s.push('<defs><style>' + fontCSS + '</style></defs>');
    s.push('<rect width="' + W + '" height="' + H + '" fill="' + pal.bg + '"/>');
    s.push('<path d="' + path({ type: 'Sphere' }) + '" fill="' + pal.ocean + '" stroke="none"/>');
    s.push('<path d="' + path(grat()) + '" fill="none" stroke="' + pal.graticule + '" stroke-width="0.5" opacity="0.5"/>');
    s.push('<path d="' + path(geo.land) + '" fill="' + pal.land + '" stroke="none"/>');
    s.push('<path d="' + path(geo.mesh) + '" fill="none" stroke="' + pal.landEdge + '" stroke-width="0.6" opacity="0.9"/>');
    s.push('<path d="' + path(geo.outer) + '" fill="none" stroke="' + pal.landEdge + '" stroke-width="0.8" opacity="0.9"/>');
    s.push('<path d="' + path({ type: 'Sphere' }) + '" fill="none" stroke="' + pal.rule + '" stroke-width="1"/>');

    // Pins (national on top of academic etc. — draw low tiers first)
    var order = { labos: 0, academic: 1, commercial: 2, national: 3 };
    var pts = entries.map(function (d) {
      var p = proj([d.lon, d.lat]);
      return { d: d, x: p[0], y: p[1], r: investRadius(d.invest) * 1.5 };
    }).sort(function (a, b) { return (order[a.d.tier] || 0) - (order[b.d.tier] || 0); });
    // Spread co-located pins in a small ring so every tier colour stays
    // visible (the live map's anti-overlap pass doesn't run here).
    var buckets = {};
    pts.forEach(function (q) {
      var key = Math.round(q.x / 14) + ':' + Math.round(q.y / 14);
      (buckets[key] = buckets[key] || []).push(q);
    });
    Object.keys(buckets).forEach(function (k) {
      var g = buckets[k];
      if (g.length < 2) return;
      var cx = g.reduce(function (a, q) { return a + q.x; }, 0) / g.length;
      var cy = g.reduce(function (a, q) { return a + q.y; }, 0) / g.length;
      var ring = Math.max.apply(null, g.map(function (q) { return q.r; })) + 4;
      g.forEach(function (q, i) {
        var a = (i / g.length) * 2 * Math.PI - Math.PI / 2;
        q.x = cx + ring * Math.cos(a);
        q.y = cy + ring * Math.sin(a);
      });
    });
    pts.forEach(function (q) {
      s.push('<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="' + q.r.toFixed(1) +
        '" fill="' + pal[q.d.tier] + '" fill-opacity="0.9" stroke="' + pal.bg + '" stroke-width="1.4"/>');
    });

    // Labels — only when the selection is small enough to stay readable.
    if (entries.length <= 60) {
      var placed = [];
      function collides(bx) {
        return placed.some(function (b) {
          return !(bx.x2 < b.x1 || bx.x1 > b.x2 || bx.y2 < b.y1 || bx.y1 > b.y2);
        });
      }
      pts.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).forEach(function (q) {
        var name = q.d.name;
        var w = name.length * 6.6 + 6, h = 14;
        var tries = [[q.r + 5, 4], [q.r + 5, -10], [q.r + 5, 16], [-(q.r + 5) - w, 4], [q.r + 5, 28], [q.r + 5, -22]];
        for (var i = 0; i < tries.length; i++) {
          var bx = { x1: q.x + tries[i][0], y1: q.y + tries[i][1] - 11, x2: q.x + tries[i][0] + w, y2: q.y + tries[i][1] + 3 };
          if (bx.x1 < 8 || bx.x2 > W - 8 || bx.y1 < 100 || bx.y2 > H - 60) continue;
          if (!collides(bx)) {
            placed.push(bx);
            s.push('<text x="' + bx.x1.toFixed(1) + '" y="' + (q.y + tries[i][1]).toFixed(1) +
              '" font-family="' + SANS + '" font-size="11" font-weight="600" fill="' + pal.ink2 + '">' + esc(name) + '</text>');
            return;
          }
        }
      });
    }

    // Title block
    var countries = {};
    entries.forEach(function (d) { countries[d.country] = 1; });
    var nC = Object.keys(countries).length;
    var date = new Date().toISOString().slice(0, 10);
    var title = exportTitle();
    var titleSize = title.length > 58 ? 24 : 30;
    s.push('<text x="40" y="52" font-family="' + SANS + '" font-size="' + titleSize + '" font-weight="700" fill="' + pal.ink + '">' + esc(title) + '</text>');
    s.push('<text x="40" y="78" font-family="' + MONO + '" font-size="13" letter-spacing="1.5" fill="' + pal.ink3 + '">' +
      entries.length + ' INITIATIVES · ' + nC + ' COUNTRIES · ' + date + '</text>');

    // Legend (bottom-left) with per-tier counts of the selection
    var lx = 40, ly = H - 36;
    ['national', 'academic', 'commercial', 'labos'].forEach(function (tier) {
      var n = entries.filter(function (d) { return d.tier === tier; }).length;
      if (!n) return;
      var label = (CATS.tier.options.find(function (o) { return o.id === tier; }) || { label: tier }).label;
      s.push('<circle cx="' + (lx + 5) + '" cy="' + (ly - 4) + '" r="5" fill="' + pal[tier] + '"/>');
      var txt = label + ' (' + n + ')';
      s.push('<text x="' + (lx + 16) + '" y="' + ly + '" font-family="' + SANS + '" font-size="12" fill="' + pal.ink2 + '">' + esc(txt) + '</text>');
      lx += 16 + txt.length * 6.6 + 26;
    });

    // Attribution (bottom-right)
    s.push('<text x="' + (W - 40) + '" y="' + (H - 36) + '" text-anchor="end" font-family="' + MONO + '" font-size="11" fill="' + pal.ink3 + '">sdl-map.discoverylabs.nl · open data (MIT)</text>');

    s.push('</svg>');
    return s.join('\n');
  }

  // ---- font embedding (raster fidelity: <img>-loaded SVGs cannot fetch) --
  var _fontCSS = null;
  function fontCSS() {
    if (_fontCSS) return _fontCSS;
    function fetch64(url) {
      return fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
        return new Promise(function (res, rej) {
          var fr = new FileReader();
          fr.onload = function () { res(fr.result); };
          fr.onerror = rej;
          fr.readAsDataURL(b);
        });
      });
    }
    _fontCSS = Promise.all([fetch64('/fonts/Inter.woff2'), fetch64('/fonts/IBMPlexMono-400.woff2')])
      .then(function (u) {
        return "@font-face{font-family:'Inter';src:url(" + u[0] + ") format('woff2');font-weight:100 900;}" +
               "@font-face{font-family:'IBM Plex Mono';src:url(" + u[1] + ") format('woff2');font-weight:400;}";
      })
      .catch(function () { return ''; });
    return _fontCSS;
  }

  // ---- raster + pdf ------------------------------------------------------
  function rasterize(svgText, type, quality, bg) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = W * RASTER_SCALE; c.height = H * RASTER_SCALE;
        var x = c.getContext('2d');
        if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL(type, quality));
      };
      img.onerror = function (e) { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }

  // Minimal one-page PDF wrapping a JPEG (DCTDecode) — no library needed.
  function jpegToPdf(jpegDataUrl) {
    var b64 = jpegDataUrl.split(',')[1];
    var bin = atob(b64);
    var jpeg = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i);
    var wPt = (W * 72 / 96).toFixed(2), hPt = (H * 72 / 96).toFixed(2);
    var enc = new TextEncoder();
    var parts = [], offsets = [], pos = 0;
    function push(s) { var u = (s instanceof Uint8Array) ? s : enc.encode(s); parts.push(u); pos += u.length; }
    push('%PDF-1.4\n');
    offsets[1] = pos; push('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n');
    offsets[2] = pos; push('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n');
    offsets[3] = pos; push('3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ' + wPt + ' ' + hPt + ']/Resources<</XObject<</Im1 4 0 R>>>>/Contents 5 0 R>>endobj\n');
    offsets[4] = pos;
    push('4 0 obj<</Type/XObject/Subtype/Image/Width ' + W * RASTER_SCALE + '/Height ' + H * RASTER_SCALE +
      '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' + jpeg.length + '>>stream\n');
    push(jpeg);
    push('\nendstream endobj\n');
    var content = 'q ' + wPt + ' 0 0 ' + hPt + ' 0 0 cm /Im1 Do Q';
    offsets[5] = pos; push('5 0 obj<</Length ' + content.length + '>>stream\n' + content + '\nendstream endobj\n');
    var xref = pos;
    var pad = function (n) { return String(n).padStart(10, '0'); };
    push('xref\n0 6\n0000000000 65535 f \n' + [1, 2, 3, 4, 5].map(function (i) { return pad(offsets[i]) + ' 00000 n \n'; }).join(''));
    push('trailer<</Size 6/Root 1 0 R>>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }

  function download(name, blobOrUrl) {
    var a = document.createElement('a');
    if (typeof blobOrUrl === 'string') a.href = blobOrUrl;
    else a.href = URL.createObjectURL(blobOrUrl);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof blobOrUrl !== 'string') setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  // ---- dialog ------------------------------------------------------------
  var STYLE = '\n.exp-backdrop{position:fixed;inset:0;z-index:400;display:none;align-items:center;justify-content:center;background:oklch(0.1 0.01 240/0.55);backdrop-filter:blur(4px);}\n.exp-backdrop.open{display:flex;}\n.exp-card{width:min(440px,92vw);background:var(--surface-overlay,var(--bg-2));border:1px solid var(--rule);border-radius:12px;padding:22px 24px;color:var(--ink);font-family:var(--font-sans);}\n.exp-card h2{margin:0 0 4px;font-size:17px;font-weight:650;}\n.exp-intro{font-size:12.5px;color:var(--ink-2);line-height:1.5;margin:2px 0 10px;}\n.exp-sub{font-family:var(--font-mono);font-size:11px;letter-spacing:0.08em;color:var(--ink-3);margin-bottom:16px;}\n.exp-row{display:flex;align-items:center;gap:10px;margin:12px 0;}\n.exp-row .lbl{font-size:12px;color:var(--ink-2);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.14em;min-width:64px;}\n.exp-seg{display:flex;gap:6px;flex-wrap:wrap;}\n.exp-seg button{padding:7px 14px;font-size:13px;font-family:var(--font-sans);background:var(--bg-2);color:var(--ink-2);border:1px solid var(--rule);border-radius:7px;cursor:pointer;}\n.exp-seg button:hover{background:var(--bg-3);color:var(--ink);}\n.exp-seg button.sel{color:var(--ink);border-color:var(--ink-3);background:var(--bg-3);}\n.exp-seg a{padding:7px 14px;font-size:13px;font-family:var(--font-sans);background:var(--bg-2);color:var(--ink-2);border:1px solid var(--rule);border-radius:7px;text-decoration:none;}\n.exp-seg a:hover{background:var(--bg-3);color:var(--ink);}\n.exp-close{position:absolute;top:10px;right:12px;background:none;border:none;color:var(--ink-3);font-size:20px;cursor:pointer;}\n.exp-card{position:relative;}\n.exp-note{font-size:11px;color:var(--ink-3);margin-top:14px;line-height:1.5;}\n.exp-busy{opacity:0.5;pointer-events:none;}\n';

  var theme = 'light';

  function openMapDialog() {
    var entries = window.__sdlGetFiltered ? window.__sdlGetFiltered() : (window.SDL_DATA || []);
    var el = document.getElementById('exp-map-backdrop');
    if (!el) return;
    var countries = {};
    entries.forEach(function (d) { countries[d.country] = 1; });
    document.getElementById('exp-count').textContent =
      entries.length + ' initiatives · ' + Object.keys(countries).length + ' countries · current filters apply';
    el.classList.add('open');
  }

  function openDataDialog() {
    var el = document.getElementById('exp-data-backdrop');
    if (el) el.classList.add('open');
  }

  function wire() {
    var n = (window.SDL_DATA || []).length || '';
    var host = document.createElement('div');
    host.innerHTML =
      '<style>' + STYLE + '</style>' +
      // --- Map export dialog ---
      '<div class="exp-backdrop" id="exp-map-backdrop">' +
      '<div class="exp-card">' +
      '<button class="exp-close" aria-label="Close">×</button>' +
      '<h2>Export map</h2>' +
      '<div class="exp-intro">Select filters on the map, then export the current view — the title, crop, and legend follow your selection.</div>' +
      '<div class="exp-sub" id="exp-count"></div>' +
      '<div class="exp-row"><span class="lbl">Theme</span><span class="exp-seg" id="exp-theme">' +
      '<button data-v="light" class="sel">Light</button><button data-v="dark">Dark</button></span></div>' +
      '<div class="exp-row"><span class="lbl">Format</span><span class="exp-seg" id="exp-fmt">' +
      '<button data-v="svg">SVG</button><button data-v="png">PNG</button>' +
      '<button data-v="jpeg">JPEG</button><button data-v="pdf">PDF</button></span></div>' +
      '<div class="exp-note">SVG stays vector-editable; PNG/JPEG render at 3200×2000; PDF wraps the raster on one page.</div>' +
      '</div></div>' +
      // --- Data & sharing dialog ---
      '<div class="exp-backdrop" id="exp-data-backdrop">' +
      '<div class="exp-card">' +
      '<button class="exp-close" aria-label="Close">×</button>' +
      '<h2>Data & sharing</h2>' +
      '<div class="exp-intro">Take the full dataset with you, or share the map.</div>' +
      '<div class="exp-row"><span class="lbl">Data</span><span class="exp-seg">' +
      '<a href="/sdl-data.txt" download="sdl-landscape.txt">TXT</a>' +
      '<a href="/sdl-data.csv" download="sdl-landscape.csv">CSV</a>' +
      '<a href="/sdl-data.xlsx" download="sdl-landscape.xlsx">XLSX</a>' +
      '<a href="/analytics/sdl-analytics.zip" download>Charts pack</a></span></div>' +
      '<div class="exp-row"><span class="lbl">Share</span><span class="exp-seg" id="exp-share"></span></div>' +
      '<div class="exp-note">Downloads always cover the full ' + n + '-entry dataset, regenerated with every update. The charts pack holds 7 analysis charts (country, type, domain, maturity, AI-readiness, growth, investment) as SVG + PNG.</div>' +
      '</div></div>';
    document.body.appendChild(host);

    document.querySelectorAll('.exp-backdrop').forEach(function (bd) {
      bd.addEventListener('click', function (e) {
        if (e.target === bd) bd.classList.remove('open');
      });
      bd.querySelector('.exp-close').onclick = function () { bd.classList.remove('open'); };
    });
    document.getElementById('exp-theme').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      theme = b.dataset.v;
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); });
    });
    document.getElementById('exp-fmt').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      doExport(b.dataset.v);
    });

    // Share the WEBSITE (not the rendered export) to social platforms.
    var shareURL = 'https://sdl-map.discoverylabs.nl';
    var shareText = 'The Global Self-Driving Lab Landscape — ' +
      ((window.SDL_DATA || []).length || 'over 100') + ' initiatives mapped worldwide';
    var eu = encodeURIComponent(shareURL), et = encodeURIComponent(shareText);
    var shares = [
      ['X', 'https://twitter.com/intent/tweet?text=' + et + '&url=' + eu],
      ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + eu],
      ['Bluesky', 'https://bsky.app/intent/compose?text=' + et + '%20' + eu],
    ];
    var shareHost = document.getElementById('exp-share');
    shares.forEach(function (s) {
      var a = document.createElement('a');
      a.textContent = s[0];
      a.href = s[1];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      shareHost.appendChild(a);
    });

    injectFabs();
    window.__sdlExportOpen = openMapDialog;
    window.__sdlDataOpen = openDataDialog;
  }

  // Floating buttons 3 + 4 in the top-left cluster, next to the info
  // (wm-reopen) and clear (sdl-clear-floating) round buttons, same style.
  var FAB_TITLES = {
    map: { en: 'Export map', 'zh-Hans': '导出地图', 'zh-Hant': '匯出地圖', ja: '地図をエクスポート', ko: '지도 내보내기' },
    data: { en: 'Data & sharing', 'zh-Hans': '数据与分享', 'zh-Hant': '數據與分享', ja: 'データと共有', ko: '데이터 및 공유' },
  };
  var ICON_EXPORT =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/>' +
    '<line x1="12" y1="15" x2="12" y2="3"/>' +
    '</svg>';
  var ICON_DATA =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<ellipse cx="12" cy="5" rx="8" ry="3"/>' +
    '<path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/>' +
    '<path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>' +
    '</svg>';

  function injectFabs() {
    if (document.getElementById('sdl-export-floating')) return;
    var embed = !!window.SDL_EMBED;
    var key = window.SDL_LANG === 'zh'
      ? (window.SDL_ZH_SCRIPT === 'Hant' ? 'zh-Hant' : 'zh-Hans')
      : (window.SDL_LANG || 'en');

    function makeFab(id, kind, icon, onClick) {
      var title = FAB_TITLES[kind][key] || FAB_TITLES[kind].en;
      var btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'sdl-fab';
      btn.setAttribute('aria-label', title);
      btn.setAttribute('title', title);
      btn.innerHTML = icon;
      btn.addEventListener('click', onClick);
      document.body.appendChild(btn);
    }

    // Geometry mirrors #sdl-clear-floating (embed) / takes its slot when the
    // clear button is absent (standalone).
    var pos = embed
      ? ['#sdl-export-floating { top: 14px; left: 122px; }',
         '#sdl-data-floating   { top: 14px; left: 174px; }',
         '@media (max-width: 768px) {',
         '  .sdl-fab { top: max(18px, env(safe-area-inset-top, 0px) + 12px) !important; width: 56px; height: 56px; }',
         '  #sdl-export-floating { left: 142px; }',
         '  #sdl-data-floating   { left: 206px; }',
         '}',
         '@media (max-width: 480px) {',
         '  .sdl-fab { top: max(16px, env(safe-area-inset-top, 0px) + 10px) !important; width: 52px; height: 52px; }',
         '  #sdl-export-floating { left: 132px; }',
         '  #sdl-data-floating   { left: 192px; }',
         '}']
      : ['#sdl-export-floating { top: calc(var(--header-h, 92px) + 16px); left: 70px; }',
         '#sdl-data-floating   { top: calc(var(--header-h, 92px) + 16px); left: 122px; }'];
    var s = document.createElement('style');
    s.textContent = [
      '.sdl-fab {',
      '  position: fixed;',
      '  width: 44px; height: 44px;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  background: oklch(from var(--bg) l c h / 0.65);',
      '  border: 1px solid var(--rule);',
      '  color: var(--ink-2);',
      '  border-radius: 50%;',
      '  cursor: pointer; padding: 0;',
      '  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);',
      '  box-shadow: 0 2px 8px oklch(0 0 0 / 0.12);',
      '  z-index: 55;',
      '  pointer-events: auto !important;',
      '  -webkit-tap-highlight-color: rgba(0,0,0,0.12);',
      '  touch-action: manipulation;',
      '  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;',
      '}',
      '.sdl-fab:hover { background: var(--bg); color: var(--ink); transform: translateY(-1px); }',
      '.sdl-fab:active { transform: scale(0.94); background: var(--bg); color: var(--ink); }',
      '.sdl-fab:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }',
    ].concat(pos).join('\n');
    (document.head || document.documentElement).appendChild(s);
    makeFab('sdl-export-floating', 'map', ICON_EXPORT, openMapDialog);
    makeFab('sdl-data-floating', 'data', ICON_DATA, openDataDialog);
  }

  function doExport(fmt) {
    var card = document.querySelector('#exp-map-backdrop .exp-card');
    card.classList.add('exp-busy');
    var entries = window.__sdlGetFiltered ? window.__sdlGetFiltered() : (window.SDL_DATA || []);
    var date = new Date().toISOString().slice(0, 10);
    var base = 'sdl-map-' + date;
    var done = function () { card.classList.remove('exp-busy'); };
    try {
      var fit = makeProjection(entries);
      // Cropped views get the 50m coastlines; whole-world stays light on 110m.
      var geoP = fit.zoom > 3 ? hiResGeo() : Promise.resolve(null);
      if (fmt === 'svg') {
        geoP.then(function (g) {
          var svg = buildExportSVG(entries, theme, '', fit, g);
          download(base + '.svg', new Blob([svg], { type: 'image/svg+xml' }));
        }).then(done, function (err) { console.error('export failed', err); done(); });
        return;
      }
      Promise.all([fontCSS(), geoP]).then(function (fg) {
        var svg = buildExportSVG(entries, theme, fg[0], fit, fg[1]);
        var pal = resolveTokens(theme);
        if (fmt === 'png') {
          return rasterize(svg, 'image/png', undefined, null).then(function (u) { download(base + '.png', u); });
        }
        if (fmt === 'jpeg') {
          return rasterize(svg, 'image/jpeg', 0.92, pal.bg).then(function (u) { download(base + '.jpg', u); });
        }
        if (fmt === 'pdf') {
          return rasterize(svg, 'image/jpeg', 0.92, pal.bg).then(function (u) { download(base + '.pdf', jpegToPdf(u)); });
        }
      }).then(done, function (err) { console.error('export failed', err); done(); });
    } catch (err) {
      console.error('export failed', err);
      done();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
