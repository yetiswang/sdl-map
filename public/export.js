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
      bg: gv('--bg'), ocean: gv('--globe-gradient-end') || gv('--bg-2'),
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

  function buildExportSVG(entries, theme, fontCSS) {
    var pal = resolveTokens(theme);
    var geo = window.__sdlExportGeo;
    var CATS = window.SDL_CATEGORIES;

    // Fit the projection to the selected pins; clamp so one lone pin doesn't
    // produce a street-level map and the world fit stays the floor.
    var proj = d3.geoNaturalEarth1();
    var worldScale = d3.geoNaturalEarth1().fitExtent([[40, 110], [W - 40, H - 130]], { type: 'Sphere' }).scale();
    var mp = { type: 'MultiPoint', coordinates: entries.map(function (d) { return [d.lon, d.lat]; }) };
    proj.fitExtent([[70, 140], [W - 70, H - 160]], mp);
    var maxScale = worldScale * 6;
    if (!isFinite(proj.scale()) || proj.scale() > maxScale) {
      proj.scale(maxScale);
      var cen = d3.geoCentroid(mp);
      if (cen && isFinite(cen[0])) {
        var p = proj(cen), t = proj.translate();
        proj.translate([t[0] + (W / 2 - p[0]), t[1] + (H * 0.53 - p[1])]);
      }
    }
    if (proj.scale() < worldScale) {
      proj = d3.geoNaturalEarth1().fitExtent([[40, 110], [W - 40, H - 130]], { type: 'Sphere' });
    }
    var path = d3.geoPath(proj);
    var grat = d3.geoGraticule().step([15, 15]);

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
    s.push('<text x="40" y="52" font-family="' + SANS + '" font-size="30" font-weight="700" fill="' + pal.ink + '">Global Self-Driving Lab Landscape</text>');
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
  var STYLE = '\n.exp-backdrop{position:fixed;inset:0;z-index:400;display:none;align-items:center;justify-content:center;background:oklch(0.1 0.01 240/0.55);backdrop-filter:blur(4px);}\n.exp-backdrop.open{display:flex;}\n.exp-card{width:min(440px,92vw);background:var(--surface-overlay,var(--bg-2));border:1px solid var(--rule);border-radius:12px;padding:22px 24px;color:var(--ink);font-family:var(--font-sans);}\n.exp-card h2{margin:0 0 4px;font-size:17px;font-weight:650;}\n.exp-sub{font-family:var(--font-mono);font-size:11px;letter-spacing:0.08em;color:var(--ink-3);margin-bottom:16px;}\n.exp-row{display:flex;align-items:center;gap:10px;margin:12px 0;}\n.exp-row .lbl{font-size:12px;color:var(--ink-2);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.14em;min-width:64px;}\n.exp-seg{display:flex;gap:6px;flex-wrap:wrap;}\n.exp-seg button{padding:7px 14px;font-size:13px;font-family:var(--font-sans);background:var(--bg-2);color:var(--ink-2);border:1px solid var(--rule);border-radius:7px;cursor:pointer;}\n.exp-seg button:hover{background:var(--bg-3);color:var(--ink);}\n.exp-seg button.sel{color:var(--ink);border-color:var(--ink-3);background:var(--bg-3);}\n.exp-seg a{padding:7px 14px;font-size:13px;font-family:var(--font-sans);background:var(--bg-2);color:var(--ink-2);border:1px solid var(--rule);border-radius:7px;text-decoration:none;}\n.exp-seg a:hover{background:var(--bg-3);color:var(--ink);}\n.exp-close{position:absolute;top:10px;right:12px;background:none;border:none;color:var(--ink-3);font-size:20px;cursor:pointer;}\n.exp-card{position:relative;}\n.exp-note{font-size:11px;color:var(--ink-3);margin-top:14px;line-height:1.5;}\n.exp-busy{opacity:0.5;pointer-events:none;}\n';

  var theme = 'light';

  function openDialog() {
    var entries = window.__sdlGetFiltered ? window.__sdlGetFiltered() : (window.SDL_DATA || []);
    var el = document.getElementById('exp-backdrop');
    if (!el) return;
    var countries = {};
    entries.forEach(function (d) { countries[d.country] = 1; });
    document.getElementById('exp-count').textContent =
      entries.length + ' initiatives · ' + Object.keys(countries).length + ' countries · current filters apply';
    el.classList.add('open');
  }

  function wire() {
    var host = document.createElement('div');
    host.innerHTML =
      '<style>' + STYLE + '</style>' +
      '<div class="exp-backdrop" id="exp-backdrop">' +
      '<div class="exp-card">' +
      '<button class="exp-close" id="exp-close" aria-label="Close">×</button>' +
      '<h2>Export map</h2>' +
      '<div class="exp-sub" id="exp-count"></div>' +
      '<div class="exp-row"><span class="lbl">Theme</span><span class="exp-seg" id="exp-theme">' +
      '<button data-v="light" class="sel">Light</button><button data-v="dark">Dark</button></span></div>' +
      '<div class="exp-row"><span class="lbl">Format</span><span class="exp-seg" id="exp-fmt">' +
      '<button data-v="svg">SVG</button><button data-v="png">PNG</button>' +
      '<button data-v="jpeg">JPEG</button><button data-v="pdf">PDF</button></span></div>' +
      '<div class="exp-row"><span class="lbl">Data</span><span class="exp-seg">' +
      '<a href="/sdl-data.txt" download="sdl-landscape.txt">TXT</a>' +
      '<a href="/sdl-data.csv" download="sdl-landscape.csv">CSV</a>' +
      '<a href="/sdl-data.xlsx" download="sdl-landscape.xlsx">XLSX</a>' +
      '<a href="/analytics/sdl-analytics.zip" download>Charts pack</a></span></div>' +
      '<div class="exp-note">The map export honours the sidebar filters (type, maturity, domain, characterisation, country) — narrow the selection there first. SVG stays vector-editable; PNG/JPEG render at 3200×2000; PDF wraps the raster on one page. Data downloads and the analysis charts pack (7 charts, SVG+PNG) always cover the full dataset.</div>' +
      '</div></div>';
    document.body.appendChild(host);

    document.getElementById('exp-close').onclick = function () {
      document.getElementById('exp-backdrop').classList.remove('open');
    };
    document.getElementById('exp-backdrop').addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('open');
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

    // The sidebar (and its #export-open button) is built by the main script
    // after an async geo fetch — delegate instead of binding directly.
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#export-open')) openDialog();
    });
    window.__sdlExportOpen = openDialog;
  }

  function doExport(fmt) {
    var card = document.querySelector('.exp-card');
    card.classList.add('exp-busy');
    var entries = window.__sdlGetFiltered ? window.__sdlGetFiltered() : (window.SDL_DATA || []);
    var date = new Date().toISOString().slice(0, 10);
    var base = 'sdl-map-' + date;
    var done = function () { card.classList.remove('exp-busy'); };
    try {
      if (fmt === 'svg') {
        var svg = buildExportSVG(entries, theme, '');
        download(base + '.svg', new Blob([svg], { type: 'image/svg+xml' }));
        done();
        return;
      }
      fontCSS().then(function (fc) {
        var svg = buildExportSVG(entries, theme, fc);
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
