const test = require("node:test");
const assert = require("node:assert");
const t = require("./tags.js");

const byTarget = rules => Object.fromEntries(rules.map(r => [r.target, r]));

test("the default is colour-blind tags with a white outline", () => {
  const rules = byTarget(t.rulesFor(undefined));
  assert.strictEqual(rules["commander.red"].color, "#d55e00");
  assert.strictEqual(rules["commander.red"].mode, "oklab");
  assert.deepStrictEqual(rules["commander.red"].outline,
    { style: "round", width: 6, color: "#ffffff", outer: "auto", minimap: 1 });
  // Badges keep the game's colour but get the outline.
  assert.strictEqual(rules["mentor"].color, undefined);
  assert.ok(rules["mentor"].outline);
  // Markers and targets are off by default.
  assert.strictEqual(rules["marker.star"], undefined);
  assert.strictEqual(rules["target"], undefined);
});

test("game colours with no outline sends nothing", () => {
  const s = Object.assign(t.defaults(), { preset: "game" });
  for (const g of ["tags", "markers", "targets"]) s.style[g].outline.style = "none";
  assert.deepStrictEqual(t.rulesFor(s), []);
});

test("one colour recolours every commander tag and the commander badge only", () => {
  const s = Object.assign(t.defaults(), { preset: "single", single: "#00E5FF" });
  const rules = byTarget(t.rulesFor(s));
  for (const id of Object.keys(t.CVD)) assert.strictEqual(rules[id].color, "#00e5ff");
  assert.strictEqual(rules["squad.commander"].color, "#00e5ff");
  assert.strictEqual(rules["squad.lieutenant"].color, undefined);
  assert.strictEqual(rules["mentor"].color, undefined);
});

test("icons switched off and groups switched on", () => {
  const s = t.defaults();
  s.icons["commander.blue"] = { off: true };
  s.groups.markers = true;
  s.icons["marker.star"] = { color: "#ff2fd0" };
  s.preset = "custom";
  const rules = byTarget(t.rulesFor(s));
  assert.strictEqual(rules["commander.blue"], undefined);
  assert.strictEqual(rules["marker.star"].color, "#ff2fd0");
  // Custom with no colour of its own keeps the game's.
  assert.strictEqual(rules["commander.red"].color, undefined);
});

test("switching to custom keeps what was shown", () => {
  const s = t.withPreset(t.defaults(), "custom");
  assert.strictEqual(s.preset, "custom");
  assert.strictEqual(s.icons["commander.red"].color, "#d55e00");
  assert.deepStrictEqual(t.rulesFor(s), t.rulesFor(t.defaults()));
});

test("normalize drops junk and clamps", () => {
  const s = t.normalize({ v: 2, preset: "rainbow", style: { tags: { mode: 3, outline: { width: 99, color: "red", style: "zig" },
    scale: 9 }, markers: "junk" }, icons: { "commander.red": { color: "#ABCDEF", off: "yes" }, "evil": { color: "#000000" } } });
  assert.strictEqual(s.preset, "cvd");
  assert.strictEqual(s.style.tags.mode, "oklab");
  assert.strictEqual(s.style.tags.outline.width, 16);
  assert.strictEqual(s.style.tags.outline.color, "#ffffff");
  assert.strictEqual(s.style.tags.outline.style, "round");
  assert.strictEqual(s.style.tags.scale, 3);
  assert.deepStrictEqual(s.style.markers, t.defaults().style.markers);
  assert.deepStrictEqual(s.icons, { "commander.red": { color: "#abcdef" } });
});

test("Size steps by 10% from 50% to 300%", () => {
  assert.strictEqual(t.stepScale(1, 1), 1.1);
  assert.strictEqual(t.stepScale(2, 1), 2.1);
  assert.strictEqual(t.stepScale(3, 1), 3);
  assert.strictEqual(t.stepScale(0.5, -1), 0.5);
});

test("every target is one axidps knows", () => {
  const sdk = require("fs").readFileSync(process.env.AXIDPS_SDK || "/dev/null", "utf8");
  if (!sdk) return; // set AXIDPS_SDK=<axidps>/apps/axidps-overlay/sdk/axidps.js to check
  for (const ic of t.ICONS) assert.ok(sdk.includes(`"${ic.id}"`), ic.id);
});

test("only icons whose game colour is known show one", () => {
  const game = Object.fromEntries(t.ICONS.map(ic => [ic.id, ic.game]));
  // From the game's own palette.
  assert.strictEqual(game["commander.red"], "#d93b3b");
  assert.strictEqual(game["target"], "#ff0000");
  // Markers, chevrons and badges have no known colour yet: shown as the game's, not a guess.
  for (const id of ["marker.star", "marker.circle", "selection.blue", "squad.commander", "mentor"]) {
    assert.strictEqual(game[id], null, id);
  }
});

test("a hidden icon is hidden in the game, whatever its group or switch", () => {
  const s = t.normalize({ groups: { markers: false }, icons: { "selection.red": { hide: true, off: true } } });
  assert.deepStrictEqual(s.icons["selection.red"], { off: true, hide: true });
  const r = t.rulesFor(s).filter(x => x.target === "selection.red");
  assert.deepStrictEqual(r, [{ target: "selection.red", opacity: 0 }]);
  // Shown again: nothing for it while its group is off.
  const s2 = t.normalize({ groups: { markers: false }, icons: { "selection.red": { hide: false } } });
  assert.strictEqual(t.rulesFor(s2).some(x => x.target === "selection.red"), false);
});

test("settings saved before per-tab styles start every tab from the old shared ones", () => {
  const old = { v: 1, preset: "cvd", mode: "solid", outline: { style: "double", width: 4, color: "#000000", minimap: 2 },
    ring: { on: true, color: "#ff0000" }, scale: 2, groups: { tags: true, markers: true, targets: true }, icons: {} };
  const s = t.normalize(old);
  assert.strictEqual(s.v, 2);
  for (const g of ["tags", "markers", "targets"]) {
    assert.deepStrictEqual(s.style[g], { mode: "solid", outline: { style: "double", width: 4, color: "#000000", minimap: 2 },
      ring: { on: true, color: "#ff0000" }, scale: 2 }, g);
  }
  // Nothing changes in the game until a tab is edited.
  const rules = byTarget(t.rulesFor(s));
  assert.strictEqual(rules["marker.star"].scale, 2);
  assert.strictEqual(rules["commander.red"].mode, "solid");
});

test("each tab's size, outline and ring apply only to its own icons", () => {
  const s = t.defaults();
  s.groups.markers = true; s.groups.targets = true;
  s.style.markers.scale = 2.5;
  s.style.targets.outline.style = "none";
  s.style.targets.ring = { on: true, color: "#00ff00" };
  s.style.tags.mode = "blend";
  const rules = byTarget(t.rulesFor(s));
  assert.strictEqual(rules["marker.star"].scale, 2.5);
  assert.strictEqual(rules["commander.red"].scale, undefined);
  assert.strictEqual(rules["target"].scale, undefined);
  assert.strictEqual(rules["target"].outline, undefined);
  assert.deepStrictEqual(rules["target"].ring, { color: "#00ff00", outline: "auto" });
  assert.ok(rules["commander.red"].outline);
  assert.strictEqual(rules["commander.red"].ring, undefined);
  assert.strictEqual(rules["commander.red"].mode, "blend");
});

test("every tab starts with the old defaults", () => {
  const d = t.defaults();
  assert.strictEqual(d.v, 2);
  for (const g of ["tags", "markers", "targets"]) {
    assert.deepStrictEqual(d.style[g], { mode: "oklab", outline: { style: "round", width: 6, color: "#ffffff", minimap: 1 },
      ring: { on: false, color: "#000000" }, scale: 1 });
  }
  assert.notStrictEqual(d.style.tags, d.style.markers, "tabs don't share one object");
});
