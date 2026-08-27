export const NAMES = {
  BRA: "Brasil",
  ARG: "Argentina",
  CHL: "Chile",
  COL: "Colômbia",
  ECU: "Equador",
  MEX: "México",
  PER: "Peru",
  URY: "Uruguai",
  BGR: "Bulgária",
  HUN: "Hungria",
  POL: "Polônia",
  RUS: "Rússia",
  TUR: "Turquia",
  UKR: "Ucrânia",
  CHN: "China",
  IND: "Índia",
  IDN: "Indonésia",
  MYS: "Malásia",
  THA: "Tailândia",
  ZAF: "África do Sul",
  KOR: "Coreia",
  CZE: "Chéquia",
  UMC: "Upper middle income",
  LCN: "América Latina",
  OECD: "Média OCDE",
};

const BAND = [0.65, 1.35];
const WAVE = ["BRA", "CHL", "PER", "COL", "ARG", "URY", "RUS", "IDN"];
const SKIP = new Set(["UMC", "LCN", "OECD"]);

export function series(metric, rows) {
  return rows
    .filter((d) => d.metric === metric)
    .map((d) => ({
      ...d,
      name: NAMES[d.iso] ?? d.country,
    }));
}

export function at(rows, iso, year) {
  return rows.find((d) => d.iso === iso && d.year === year)?.value;
}

export function last(rows, iso) {
  let best;
  for (const row of rows) {
    if (row.iso !== iso) continue;
    if (best == null || row.year > best.year) best = row;
  }
  return best;
}

export function times(rows, iso, y0 = 1995) {
  const a = at(rows, iso, y0);
  const b = last(rows, iso);
  if (a == null || b == null) return;
  return { y0, y1: b.year, x: b.value / a, last: b.value };
}

export function keep(rows, isos) {
  const set = new Set(isos);
  return rows.filter((d) => set.has(d.iso));
}

export function namesOf(isos) {
  return isos
    .filter((iso) => iso !== "BRA")
    .map((iso) => NAMES[iso] ?? iso)
    .join(" · ");
}

function bandIsos(rows, year) {
  const bra = at(rows, "BRA", year);
  return [...new Set(rows.map((d) => d.iso))].filter((iso) => {
    const v = at(rows, iso, year);
    if (v == null) return false;
    const r = v / bra;
    return r >= BAND[0] && r <= BAND[1];
  });
}

function indexAt(rows, year = 1990) {
  const base = new Map();
  for (const iso of new Set(rows.map((d) => d.iso))) {
    const v = at(rows, iso, year);
    if (v) base.set(iso, v);
  }
  return rows
    .filter((d) => base.has(d.iso))
    .map((d) => ({ ...d, value: (100 * d.value) / base.get(d.iso) }));
}

function deltaPct(rows, y0, y1) {
  return [...new Set(rows.map((d) => d.iso))]
    .map((iso) => {
      const a = at(rows, iso, y0);
      const b = at(rows, iso, y1);
      if (a == null || b == null) return;
      return { iso, name: NAMES[iso] ?? iso, value: (100 * (b - a)) / a };
    })
    .filter((d) => d);
}

export const fmtX = (x) =>
  x == null ? "—" : `×${x.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
export const fmtPct = (x) =>
  x == null ? "—" : `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
export const fmtIdx = (x) =>
  x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export const fmtGini = (x) =>
  x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export const fmt2 = (x) =>
  x == null
    ? "—"
    : x.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 1 });
export const fmtDays = (x) =>
  x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function load(wdi, pisa) {
  const ppp = series("gdp_pc_ppp", wdi);
  const prod = series("gdp_per_employed", wdi);
  const inv = series("investment", wdi);
  const trd = series("trade", wdi);
  const edu = series("edu_spend", wdi);
  const rq = series("reg_quality", wdi);
  const days = series("start_days", wdi);
  const efw = series("efw", wdi);
  const gini = series("gini", wdi);
  const pov = series("poverty_830", wdi);
  const hunger = series("undernourish", wdi);
  const pisaMath = series("pisa_math", pisa);
  const pisaRead = series("pisa_read", pisa);
  const pisaSci = series("pisa_sci", pisa);

  const club90 = bandIsos(ppp, 1990);
  const ppp90 = keep(ppp, club90);
  const ppp90rel = indexAt(ppp90, 1990);
  const pppWave = keep(ppp, WAVE);
  const pppWaveRel = indexAt(pppWave, 1990);
  const prod90rel = indexAt(keep(prod, club90), 1991);
  const prodWave = keep(prod, WAVE);
  const prodWaveRel = indexAt(prodWave, 1991);

  return {
    namesOf,
    club90,
    ppp90,
    ppp90rel,
    pppWaveRel,
    prod90rel,
    prodWaveRel,
    inv,
    trd,
    rq90: keep(rq, club90),
    days90: keep(days, club90),
    efw90: keep(efw, club90),
    pisa90: keep(pisaMath, [...club90, "OECD"]),
    edu90: keep(edu, [...club90, "UMC"]),
    gini90: keep(gini, club90),
    pov90: keep(pov, [...club90, "UMC"]),
    hunger90: keep(hunger, [...club90, "UMC"]),
    waveBoom: deltaPct(pppWave, 2003, 2010),
    prodWaveBoom: deltaPct(prodWave, 2003, 2010),
    pppBra: times(ppp, "BRA"),
    pppUmc: times(ppp, "UMC"),
    pppPol: times(ppp, "POL"),
    invBra: last(inv, "BRA"),
    invUmc: last(inv, "UMC"),
    trdBra: last(trd, "BRA"),
    trdMex: last(trd, "MEX"),
    trdPol: last(trd, "POL"),
    eduBra: last(edu, "BRA"),
    eduUmc: last(edu, "UMC"),
    eduPol: last(edu, "POL"),
    eduKor: last(edu, "KOR"),
    bra90rel: last(ppp90rel, "BRA")?.value,
    pol90rel: last(ppp90rel, "POL")?.value,
    kor90rel: last(ppp90rel, "KOR")?.value,
    zaf90rel: last(ppp90rel, "ZAF")?.value,
    braWaveRel: last(pppWaveRel, "BRA")?.value,
    chlWaveRel: last(pppWaveRel, "CHL")?.value,
    idnWaveRel: last(pppWaveRel, "IDN")?.value,
    braProdRel: last(prod90rel, "BRA")?.value,
    polProdRel: last(prod90rel, "POL")?.value,
    korProdRel: last(prod90rel, "KOR")?.value,
    zafProdRel: last(prod90rel, "ZAF")?.value,
    braProdWave: last(prodWaveRel, "BRA")?.value,
    chlProdWave: last(prodWaveRel, "CHL")?.value,
    idnProdWave: last(prodWaveRel, "IDN")?.value,
    braPisa: last(pisaMath, "BRA")?.value,
    oecdPisa: last(pisaMath, "OECD")?.value,
    korPisa: last(pisaMath, "KOR")?.value,
    polPisa: last(pisaMath, "POL")?.value,
    braPisaRead: last(pisaRead, "BRA")?.value,
    braPisaSci: last(pisaSci, "BRA")?.value,
    braGini: last(gini, "BRA"),
    polGini: last(gini, "POL"),
    korGini: last(gini, "KOR"),
    zafGini: last(gini, "ZAF"),
    braPov: last(pov, "BRA"),
    umcPov: last(pov, "UMC"),
    polPov: last(pov, "POL"),
    korPov: last(pov, "KOR"),
    zafPov: last(pov, "ZAF"),
    povBra90: at(pov, "BRA", 1990),
    braHunger: last(hunger, "BRA"),
    umcHunger: last(hunger, "UMC"),
    zafHunger: last(hunger, "ZAF"),
    hungerBra01: at(hunger, "BRA", 2001),
    braRq: last(rq, "BRA"),
    polRq: last(rq, "POL"),
    korRq: last(rq, "KOR"),
    chlRq: last(rq, "CHL"),
    braDays: last(days, "BRA"),
    chlDays: last(days, "CHL"),
    polDays: last(days, "POL"),
    korDays: last(days, "KOR"),
    braEfw: last(efw, "BRA"),
    chlEfw: last(efw, "CHL"),
    polEfw: last(efw, "POL"),
    korEfw: last(efw, "KOR"),
    spendPisa: [...new Set(pisaMath.map((d) => d.iso))]
      .filter((iso) => !SKIP.has(iso))
      .map((iso) => {
        const e = last(edu, iso);
        const p = last(pisaMath, iso);
        if (e == null || p == null) return;
        return {
          iso,
          name: NAMES[iso] ?? iso,
          edu: e.value,
          pisa: p.value,
          eduYear: e.year,
          pisaYear: p.year,
        };
      })
      .filter((d) => d),
    fmtX,
    fmtPct,
    fmtIdx,
    fmtGini,
    fmt2,
    fmtDays,
  };
}
