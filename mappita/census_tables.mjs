// センサス（令和3年度 箇所別基本表・47都道府県）から、(1) 県ごとの係数 (2) 道の種類ごとの制限速度の平均 を作り、lua の表として書き出す
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const DIR = process.argv[2], OUT = process.argv[3];
const num = (v) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : null; };
const avg2 = (a, b) => { const v = [num(a), num(b)].filter(Boolean); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const MIN_KM = 30, CAP = 1.0;
const fac = {}, nat = {}, lim = {};
const acc = (o, k, v, L) => { const a = (o[k] ??= [0, 0]); a[0] += v * L; a[1] += L; };
// 道の種類（センサス）→ 地図の道の種類：1,2,自専＝motorway／3＝trunk（一般国道）／4,5＝primary（主要地方道）／6＝secondary（一般都道府県道）／7＝tertiary（指定市の一般市道）
const CLS = { "3": "trunk", "4": "primary", "5": "primary", "6": "secondary", "7": "tertiary" };
for (const f of readdirSync(DIR).sort()) {
  const pref = f.slice(1, 3); fac[pref] = {};
  for (const r of readFileSync(`${DIR}/${f}`, "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(","))) {
    const L = num(r[23]), l = num(r[140]); if (!L || !l) continue;
    const a = r[143]; if (!["1", "2", "3", "4", "5"].includes(a)) continue;
    const did = a === "1" || a === "2";
    const hw = r[3] === "1" || r[3] === "2" || r[19] === "1";
    const cls = hw ? "motorway" : CLS[r[3]]; if (!cls) continue;
    acc(lim, `${cls}|${did ? 1 : 0}`, l, L);
    const jam = avg2(r[75], r[82]); if (!jam) continue;
    const k = `${hw ? "hw" : "loc"}${did ? "D" : "O"}`;
    acc(fac[pref], k, jam / l, L); acc(nat, k, jam / l, L);
  }
}
const KEYS = ["hwD", "hwO", "locD", "locO"];
const natF = Object.fromEntries(KEYS.map((k) => [k, Math.min(CAP, nat[k][0] / nat[k][1])]));
const table = {};
for (const [p, o] of Object.entries(fac)) table[p] = Object.fromEntries(KEYS.map((k) => [k, +(o[k] && o[k][1] >= MIN_KM ? Math.min(CAP, o[k][0] / o[k][1]) : natF[k]).toFixed(3)]));
const limits = Object.fromEntries(Object.entries(lim).map(([k, [s, L]]) => [k, Math.round(s / L)]));
writeFileSync(`${OUT}/census_tables.json`, JSON.stringify({ national: natF, prefs: table, limits }, null, 1));
// lua：mp_factor["27"] = {0.90, 0.99, 0.45, 0.84} の順（高速中・高速外・一般中・一般外）
const lua = [
  "-- 生成：census_tables.mjs（国土交通省 令和3年度 全国道路・街路交通情勢調査 箇所別基本表を加工）。",
  "-- 係数＝混雑時の旅行速度÷指定最高速度（延長で重み付け）。延長30km未満の区分は全国の値、上限1.0",
  `mp_factor_national = {${KEYS.map((k) => natF[k].toFixed(3)).join(", ")}}`,
  "mp_factor = {",
  ...Object.entries(table).map(([p, o]) => `  ["${p}"] = {${KEYS.map((k) => o[k].toFixed(3)).join(", ")}},`),
  "}",
  "-- 制限速度が書かれていない道に当てる、センサスの指定最高速度の平均（全国・延長で重み付け）。[道の種類][DIDの中=1／外=0]",
  "mp_limit = {",
  ...["motorway", "trunk", "primary", "secondary", "tertiary"].map((c) => `  ["${c}"] = {[1] = ${limits[`${c}|1`] ?? "nil"}, [0] = ${limits[`${c}|0`] ?? "nil"}},`),
  "}",
].join("\n");
writeFileSync(`${OUT}/mp_tables.lua`, lua + "\n");
console.log("全国の係数", KEYS.map((k) => `${k} ${natF[k].toFixed(2)}`).join("  "));
for (const p of ["24", "25", "26", "27", "28", "29", "30"]) console.log(p, KEYS.map((k) => table[p][k].toFixed(2)).join(" "));
console.log("制限速度の平均", JSON.stringify(limits));
