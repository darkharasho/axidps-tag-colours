// Tag Colours: the settings model and the rules it sends (pure, tested with node), then the
// settings window.
(function () {
  "use strict";

  // The icons, in the order the window lists them, with the game's colour where it is known (the
  // tag palette and targets). The rest are null until read from the game itself.
  const GROUPS = [
    {id: "tags", name: "Tags", icons: [
      ["commander.red", "Red", "#d93b3b"], ["commander.orange", "Orange", "#e38a31"],
      ["commander.yellow", "Yellow", "#dfc623"], ["commander.green", "Green", "#40d72e"],
      ["commander.cyan", "Cyan", "#55d8d5"], ["commander.blue", "Blue", "#1599fc"],
      ["commander.purple", "Purple", "#a91ec9"], ["commander.magenta", "Pink", "#fbb0ef"],
      ["commander.white", "White", "#eeedee"], ["squad.commander", "Commander badge", null],
      ["squad.lieutenant", "Lieutenant badge", null], ["mentor", "Mentor", null]]},
    {id: "markers", name: "Markers", icons: [
      ["marker.arrow", "Arrow", null], ["marker.circle", "Circle", null],
      ["marker.heart", "Heart", null], ["marker.square", "Square", null],
      ["marker.star", "Star", null], ["marker.spiral", "Spiral", null],
      ["marker.triangle", "Triangle", null], ["marker.cross", "Cross", null],
      ["selection.orange", "Orange chevron", null], ["selection.blue", "Blue chevron", null],
      ["selection.green", "Green chevron", null], ["selection.red", "Red chevron", null]]},
    {id: "targets", name: "Targets", icons: [
      ["target", "Target", "#ff0000"], ["target.personal", "Personal target", "#ffa600"],
      ["target.combined", "Combined target", "#ff0080"], ["target.attack", "Attack target", "#ff3333"],
      ["target.attack-selected", "Selected attack target", "#ffa600"]]},
  ];
  const ICONS = GROUPS.flatMap(g => g.icons.map(([id, name, game]) => ({id, name, game, group: g.id})));

  // Okabe-Ito, for colour vision deficiency, on the nine tag colours (red, orange, yellow, green,
  // cyan, blue, purple, pink, white).
  const CVD = {"commander.red": "#d55e00", "commander.orange": "#e69f00", "commander.yellow": "#f0e442",
    "commander.green": "#009e73", "commander.cyan": "#56b4e9", "commander.blue": "#0072b2",
    "commander.purple": "#cc79a7", "commander.magenta": "#999999", "commander.white": "#ffffff"};

  const PALETTE = ["#d55e00", "#e69f00", "#f0e442", "#009e73", "#56b4e9", "#0072b2", "#cc79a7", "#999999",
    "#d93b3b", "#e38a31", "#dfc623", "#40d72e", "#55d8d5", "#1599fc", "#a91ec9", "#fbb0ef",
    "#ffffff", "#c8c8c8", "#6e6e6e", "#000000", "#ffff00", "#ff2fd0", "#7dff3a", "#00e5ff"];

  const PRESETS = [["game", "Game"], ["cvd", "Colour-blind"], ["single", "One colour"], ["custom", "Custom"]];
  const MODES = [["oklab", "Shaded"], ["blend", "Tinted"], ["solid", "Flat"]];
  const OUTLINES = [["none", "None"], ["round", "Round"], ["diamond", "Sharp"], ["double", "Double"]];

  const HEX = /^#[0-9a-f]{6}$/;
  const clampNum = (v, lo, hi, d) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

  function defaults() {
    return {v: 1, preset: "cvd", mode: "oklab", single: "#ffff00",
      groups: {tags: true, markers: false, targets: false},
      outline: {style: "round", width: 6, color: "#ffffff", minimap: 1},
      ring: {on: false, color: "#000000"},
      scale: 1, icons: {}};
  }

  // Saved settings made whole and safe: unknown or bad values fall back to the defaults.
  function normalize(s) {
    const d = defaults();
    if (!s || typeof s !== "object" || Array.isArray(s)) return d;
    const pick = (v, list, def) => (list.some(([k]) => k === v) ? v : def);
    const col = (v, def) => (typeof v === "string" && HEX.test(v.toLowerCase()) ? v.toLowerCase() : def);
    const o = s.outline || {}, r = s.ring || {}, g = s.groups || {};
    const icons = {};
    for (const ic of ICONS) {
      const e = s.icons && s.icons[ic.id];
      if (!e || typeof e !== "object") continue;
      const x = {};
      if (e.off === true) x.off = true;
      if (e.hide === true) x.hide = true;
      if (typeof e.color === "string" && HEX.test(e.color.toLowerCase())) x.color = e.color.toLowerCase();
      if (Object.keys(x).length) icons[ic.id] = x;
    }
    return {v: 1, preset: pick(s.preset, PRESETS, d.preset), mode: pick(s.mode, MODES, d.mode),
      single: col(s.single, d.single),
      groups: {tags: g.tags !== false, markers: g.markers === true, targets: g.targets === true},
      outline: {style: pick(o.style, OUTLINES, d.outline.style), width: clampNum(o.width, 0, 16, d.outline.width),
        color: col(o.color, d.outline.color), minimap: clampNum(o.minimap, 0, 4, d.outline.minimap)},
      ring: {on: r.on === true, color: col(r.color, d.ring.color)},
      scale: clampNum(s.scale, 0.5, 2, 1), icons};
  }

  // What "One colour" paints: every tag colour, and the badge that marks the commander in the squad.
  const inSingle = id => id.startsWith("commander.") || id === "squad.commander";

  // The colour an icon gets, or null to keep the game's.
  function colourOf(s, ic) {
    const own = s.icons[ic.id] && s.icons[ic.id].color;
    switch (s.preset) {
      case "cvd": return own || CVD[ic.id] || null;
      case "single": return inSingle(ic.id) ? s.single : own || null;
      case "custom": return own || null;
      default: return null;
    }
  }

  // Switch preset. Custom starts from the colours shown, so it changes nothing until edited.
  function withPreset(raw, preset) {
    const s = normalize(raw);
    if (preset === "custom" && s.preset !== "custom") {
      for (const ic of ICONS) {
        const c = colourOf(s, ic);
        if (c) s.icons[ic.id] = Object.assign({}, s.icons[ic.id], {color: c});
      }
    }
    s.preset = PRESETS.some(([k]) => k === preset) ? preset : s.preset;
    return s;
  }

  // The rules for the game: one per icon that is on in an enabled group and changes something, and
  // one that hides each hidden icon (whatever its group or switch).
  function rulesFor(raw) {
    const s = normalize(raw);
    const out = [];
    for (const ic of ICONS) {
      if (s.icons[ic.id] && s.icons[ic.id].hide) { out.push({target: ic.id, opacity: 0}); continue; }
      if (!s.groups[ic.group] || (s.icons[ic.id] && s.icons[ic.id].off)) continue;
      const r = {target: ic.id};
      const c = colourOf(s, ic);
      if (c) { r.mode = s.mode; r.color = c; }
      if (s.outline.style !== "none" && (s.outline.width > 0 || s.outline.minimap > 0)) {
        r.outline = {style: s.outline.style, width: s.outline.width, color: s.outline.color, outer: "auto",
          minimap: s.outline.minimap};
      }
      if (s.ring.on) r.ring = {color: s.ring.color, outline: "auto"};
      if (s.scale !== 1) r.scale = s.scale;
      if (Object.keys(r).length > 1) out.push(r);
    }
    return out;
  }

  // What a row shows: the icon's colour, or the game's, or a plain grey when the game's isn't known.
  const UNKNOWN = "#8a8f98";
  const shown = (c, ic) => c || ic.game || UNKNOWN;

  const pure = {GROUPS, ICONS, CVD, PALETTE, defaults, normalize, colourOf, rulesFor, withPreset};
  if (typeof module !== "undefined" && module.exports) { module.exports = pure; return; }

  // ---- the window ------------------------------------------------------------------------------

  const ax = window.axidps;
  let s = defaults(), tab = "tags", picking = null;
  const $ = q => document.querySelector(q);
  const esc = ax.esc;

  // A small picture of each kind of icon, filled with its colour, outlined as the game will be.
  function glyph(ic, fill) {
    const o = s.outline, w = o.style === "none" ? 0 : Math.max(0.8, o.width / 4);
    const stroke = o.style === "none" ? "none" : o.color;
    const join = o.style === "diamond" ? "miter" : "round";
    let shape;
    if (ic.group === "tags") {
      shape = ic.id.startsWith("commander.")
        ? `<path d="M4 6 L12 2 L20 6 L20 11 L12 15 L4 11 Z M4 14 L12 18 L20 14 L20 17 L12 22 L4 17 Z"/>`
        : `<circle cx="12" cy="12" r="8"/>`;
    } else if (ic.id.startsWith("selection.")) {
      shape = `<path d="M3 8 L12 16 L21 8 L21 12 L12 20 L3 12 Z"/>`;
    } else if (ic.group === "targets") {
      shape = `<circle cx="12" cy="12" r="7" fill="none" stroke="${fill}" stroke-width="3"/><circle cx="12" cy="12" r="2"/>`;
    } else {
      const m = {arrow: "M12 3 L20 13 L15 13 L15 21 L9 21 L9 13 L4 13 Z", circle: "M12 4 A8 8 0 1 0 12.01 4 Z",
        heart: "M12 20 L4 12 A4.5 4.5 0 0 1 12 7 A4.5 4.5 0 0 1 20 12 Z", square: "M5 5 H19 V19 H5 Z",
        star: "M12 3 L14.6 9.3 L21 9.6 L16 13.8 L17.6 20.5 L12 16.8 L6.4 20.5 L8 13.8 L3 9.6 L9.4 9.3 Z",
        spiral: "M12 12 m-1 0 a1 1 0 1 1 2 0 a3 3 0 1 1 -6 0 a5 5 0 1 1 10 0 a7 7 0 1 1 -14 0",
        triangle: "M12 3 L21 20 H3 Z", cross: "M6 4 L12 10 L18 4 L20 6 L14 12 L20 18 L18 20 L12 14 L6 20 L4 18 L10 12 L4 6 Z"};
      const k = ic.id.split(".")[1];
      shape = k === "spiral" ? `<path d="${m[k]}" fill="none" stroke="${fill}" stroke-width="2.4"/>` : `<path d="${m[k]}"/>`;
    }
    const ring = s.ring.on ? `<circle cx="12" cy="12" r="10.5" fill="none" stroke="${s.ring.color}" stroke-width="2"/>` : "";
    return `<svg viewBox="-2 -2 28 28" width="22" height="22">${ring}<g fill="${fill}" stroke="${stroke}" ` +
      `stroke-width="${w}" stroke-linejoin="${join}" paint-order="stroke">${shape}</g></svg>`;
  }

  function seg(name, list, val) {
    return `<div class="seg" data-seg="${name}">` +
      list.map(([k, label]) => `<button data-v="${k}" class="${k === val ? "on" : ""}">${esc(label)}</button>`).join("") + `</div>`;
  }
  function step(name, val, unit) {
    return `<div class="step" data-step="${name}"><button data-d="-1">&minus;</button><b>${val}${unit || ""}</b>` +
      `<button data-d="1">+</button></div>`;
  }
  function swatch(key, c) {
    return `<button class="sw" data-pick="${key}" style="background:${c}" data-tip="Choose a colour"></button>`;
  }
  function tog(key, on) { return `<span class="tog${on ? " on" : ""}" data-tog="${key}"><i></i></span>`; }

  function render() {
    const g = GROUPS.find(x => x.id === tab);
    const rows = g.icons.map(([id]) => {
      const ic = ICONS.find(x => x.id === id);
      const off = s.icons[id] && s.icons[id].off, hid = !!(s.icons[id] && s.icons[id].hide);
      const c = colourOf(s, ic);
      const editable = s.preset === "custom" || s.preset === "cvd" || (s.preset === "single" && !inSingle(id));
      return `<div class="row${off ? " off" : ""}">${tog("icon:" + id, !off)}${glyph(ic, shown(c, ic))}` +
        `<span class="nm">${esc(ic.name)}</span>` +
        `<button class="hide${hid ? " on" : ""}" data-hide="${id}" data-tip="${hid ? "Hidden in the game. Show it again" : "Hide it in the game"}">` +
        `${hid ? "Hidden" : "Hide"}</button>` +
        (editable ? swatch("icon:" + id, c || ic.game || "#ffffff") + (c && s.icons[id] && s.icons[id].color
          ? `<button class="x" data-reset="${id}" data-tip="Back to the preset's colour">&times;</button>` : `<span class="x"></span>`)
          : `<span class="game" data-tip="The game's colour">${c ? "" : "game"}</span><span class="x"></span>`) + `</div>`;
    }).join("");
    $("#app").innerHTML =
      `<div class="sec">${seg("preset", PRESETS, s.preset)}` +
      (s.preset === "single" ? `<div class="crow"><span class="lbl">Tag colour</span>${swatch("single", s.single)}</div>` : "") +
      `</div>` +
      `<div class="tabs">${GROUPS.map(x => `<button data-tab="${x.id}" class="${x.id === tab ? "on" : ""}">` +
        `${tog("group:" + x.id, s.groups[x.id])}${esc(x.name)}</button>`).join("")}</div>` +
      `<div class="list${s.groups[tab] ? "" : " dim"}">${rows}</div>` +
      `<div class="sec">` +
      `<div class="crow"><span class="lbl">Colour</span>${seg("mode", MODES, s.mode)}</div>` +
      `<div class="crow"><span class="lbl">Outline</span>${seg("outline", OUTLINES, s.outline.style)}</div>` +
      (s.outline.style !== "none" ? `<div class="crow"><span class="lbl">Width</span>${step("width", s.outline.width, "px")}` +
        `${swatch("outline", s.outline.color)}</div>` +
        `<div class="crow"><span class="lbl">On the minimap</span>${step("minimap", s.outline.minimap, "px")}</div>` : "") +
      `<div class="crow"><span class="lbl">Ring</span>${tog("ring", s.ring.on)}${s.ring.on ? swatch("ring", s.ring.color) : ""}</div>` +
      `<div class="crow"><span class="lbl">Size</span>${step("scale", Math.round(s.scale * 100), "%")}</div>` +
      `</div>` +
      (picking ? `<div class="pal">${PALETTE.map(c => `<button class="sw" data-color="${c}" style="background:${c}"></button>`).join("")}</div>` : "") +
      `<div class="foot">Changes apply in the game at once.</div>`;
  }

  function changed() {
    ax.settings.set(s);
    ax.textures.set(rulesFor(s));
    render();
  }

  function setColour(key, c) {
    if (key === "single") s.single = c;
    else if (key === "outline") s.outline.color = c;
    else if (key === "ring") s.ring.color = c;
    else if (key.startsWith("icon:")) {
      const id = key.slice(5);
      s.icons[id] = Object.assign({}, s.icons[id], {color: c});
    }
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("button, .tog");
    if (!t) { if (picking) { picking = null; render(); } return; }
    if (t.dataset.color && picking) { setColour(picking, t.dataset.color); picking = null; changed(); return; }
    if (t.dataset.pick) { picking = picking === t.dataset.pick ? null : t.dataset.pick; render(); return; }
    picking = null;
    const segEl = t.closest("[data-seg]");
    if (segEl && t.dataset.v) {
      const k = segEl.dataset.seg;
      if (k === "preset") s = withPreset(s, t.dataset.v);
      else if (k === "mode") s.mode = t.dataset.v;
      else if (k === "outline") s.outline.style = t.dataset.v;
      return changed();
    }
    const stepEl = t.closest("[data-step]");
    if (stepEl && t.dataset.d) {
      const d = Number(t.dataset.d), k = stepEl.dataset.step;
      if (k === "width") s.outline.width = Math.min(16, Math.max(0, s.outline.width + d));
      else if (k === "minimap") s.outline.minimap = Math.min(4, Math.max(0, s.outline.minimap + d * 0.5));
      else if (k === "scale") s.scale = Math.min(2, Math.max(0.5, Math.round((s.scale + d * 0.1) * 10) / 10));
      return changed();
    }
    if (t.dataset.tog) {
      const k = t.dataset.tog;
      if (k === "ring") s.ring.on = !s.ring.on;
      else if (k.startsWith("group:")) { const g = k.slice(6); s.groups[g] = !s.groups[g]; tab = g; }
      else if (k.startsWith("icon:")) {
        const id = k.slice(5), e2 = Object.assign({}, s.icons[id]);
        if (e2.off) delete e2.off; else e2.off = true;
        s.icons[id] = e2;
      }
      e.stopPropagation();
      return changed();
    }
    if (t.dataset.hide) {
      const e2 = Object.assign({}, s.icons[t.dataset.hide]);
      if (e2.hide) delete e2.hide; else e2.hide = true;
      s.icons[t.dataset.hide] = e2;
      return changed();
    }
    if (t.dataset.reset) {
      const e2 = Object.assign({}, s.icons[t.dataset.reset]);
      delete e2.color;
      s.icons[t.dataset.reset] = e2;
      return changed();
    }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); }
  });

  ax.on("settings", v => {
    s = normalize(v);
    ax.textures.set(rulesFor(s));
    render();
  });
  ax.ready(info => {
    if (!info.permissions.includes("textures")) ax.window.setStatus("needs the textures permission");
  });
  render();
})();
