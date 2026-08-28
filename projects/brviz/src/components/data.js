export const NAMES = {
  BRA: "Brasil",
  ARG: "Argentina",
  CHL: "Chile",
  COL: "Colômbia",
  ECU: "Equador",
  MEX: "México",
  PER: "Peru",
  URY: "Uruguai",
  BOL: "Bolívia",
  PRY: "Paraguai",
  VEN: "Venezuela",
  CRI: "Costa Rica",
  SLV: "El Salvador",
  GTM: "Guatemala",
  HND: "Honduras",
  NIC: "Nicarágua",
  PAN: "Panamá",
  CUB: "Cuba",
  DOM: "República Dominicana",
  HTI: "Haiti",
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
  MEAN: "Média simples",
  OECD: "Média OCDE",
  USA: "EUA",
  NZL: "Nova Zelândia",
  DEU: "Alemanha",
  OWID_HIC: "Renda alta",
  OWID_EU27: "UE-27",
  OWID_UMC: "Renda média-alta",
  WB_LAC: "América Latina",
};

const BAND = [0.65, 1.35];
const WAVE = ["BRA", "CHL", "PER", "COL", "ARG", "URY", "RUS", "IDN"];
const LATAM = [
  "ARG",
  "BOL",
  "BRA",
  "CHL",
  "COL",
  "CRI",
  "CUB",
  "DOM",
  "ECU",
  "SLV",
  "GTM",
  "HTI",
  "HND",
  "MEX",
  "NIC",
  "PAN",
  "PRY",
  "PER",
  "URY",
  "VEN",
  "LCN",
];
const LATAM_SKIP_INDEX = new Set(["HND"]);
const CLUB_EXCLUDE = new Set(
  LATAM.filter((iso) => !["ARG", "BRA", "CHL", "COL", "ECU", "MEX", "PER", "URY"].includes(iso)),
);
const SKIP = new Set(["UMC", "LCN", "OECD"]);
const DAYS_GROUPS = new Set(["OWID_HIC", "OWID_EU27", "OWID_UMC", "WB_LAC"]);
const DAYS_2019 = [
  "NZL",
  "USA",
  "CHL",
  "DEU",
  "KOR",
  "OWID_HIC",
  "OWID_EU27",
  "BRA",
  "OWID_UMC",
  "WB_LAC",
  "POL",
];

export function series(metric, rows) {
  return rows
    .filter((d) => d.metric === metric)
    .map((d) => ({
      ...d,
      year: +d.year,
      name: NAMES[d.iso] ?? d.country,
    }));
}

export function at(rows, iso, year) {
  const y = +year;
  return rows.find((d) => d.iso === iso && d.year === y)?.value;
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

function lastPoint(rows, iso) {
  const row = last(rows, iso);
  if (row == null || !Number.isFinite(row.value)) return;
  return { iso, name: NAMES[iso] ?? row.name ?? iso, year: row.year, value: row.value };
}

function lastGroup(rows, isos, exclude = new Set(["BRA"]), { minYear } = {}) {
  const items = isos
    .filter((iso) => !exclude.has(iso))
    .map((iso) => lastPoint(rows, iso))
    .filter((d) => d && (minYear == null || d.year >= minYear))
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name, "pt-BR"));
  return {
    value: items.length ? items.reduce((sum, d) => sum + d.value, 0) / items.length : undefined,
    items,
  };
}

function meanByYear(rows, { iso, name, exclude = new Set() } = {}) {
  const byYear = new Map();
  for (const d of rows) {
    if (exclude.has(d.iso)) continue;
    const slot = byYear.get(d.year) ?? { sum: 0, n: 0 };
    slot.sum += d.value;
    slot.n += 1;
    byYear.set(d.year, slot);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, { sum, n }]) => ({ iso, name, year, value: sum / n }));
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

function minusBase(rows, year) {
  const base = new Map();
  for (const iso of new Set(rows.map((d) => d.iso))) {
    const v = at(rows, iso, year);
    if (v == null) continue;
    base.set(iso, v);
  }
  return rows
    .filter((d) => base.has(d.iso))
    .map((d) => ({ ...d, value: d.value - base.get(d.iso) }));
}

function minusFirst(rows) {
  const base = new Map();
  for (const d of rows) {
    const prev = base.get(d.iso);
    if (prev == null || d.year < prev.year) base.set(d.iso, d);
  }
  return rows.map((d) => ({
    ...d,
    value: d.value - base.get(d.iso).value,
  }));
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

function beatenNames(rows, iso) {
  const val = rows.find((d) => d.iso === iso)?.value;
  if (val == null) return;
  const names = rows.filter((d) => d.iso !== iso && d.value < val).map((d) => d.name);
  if (!names.length) return;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

function meanOf(rows, iso, y0 = 1990) {
  let sum = 0;
  let n = 0;
  for (const d of rows) {
    if (d.iso !== iso || d.year < y0) continue;
    sum += d.value;
    n += 1;
  }
  if (!n) return;
  return sum / n;
}

function meanInWindow(rows, iso, y0, y1) {
  let sum = 0;
  let n = 0;
  for (const d of rows) {
    if (d.iso !== iso || d.year < y0 || d.year > y1) continue;
    sum += d.value;
    n += 1;
  }
  if (!n) return;
  return sum / n;
}

function snapshot(rows, year, isos) {
  return isos
    .map((iso) => {
      const value = at(rows, iso, year);
      if (value == null) return;
      return {
        iso,
        name: NAMES[iso] ?? iso,
        value,
        tone: iso === "BRA" ? "bra" : DAYS_GROUPS.has(iso) ? "group" : "peer",
      };
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
  const pupil = series("edu_pupil_sec", wdi);
  const sav = series("savings", wdi);
  const mfg = series("manufacturing", wdi);
  const rq = series("reg_quality", wdi);
  const rl = series("rule_of_law", wdi);
  const tot = series("tot", wdi);
  const tfp = series("tfp", wdi);
  const days = series("start_days", wdi);
  const efw = series("efw", wdi);
  const gini = series("gini", wdi);
  const pov = series("poverty_830", wdi);
  const hunger = series("undernourish", wdi);
  const pisaMath = series("pisa_math", pisa);
  const pisaRead = series("pisa_read", pisa);
  const pisaSci = series("pisa_sci", pisa);

  const club90 = bandIsos(
    ppp.filter((d) => !CLUB_EXCLUDE.has(d.iso)),
    1990,
  );
  const ppp90 = keep(ppp, club90);
  const ppp90rel = indexAt(ppp90, 1990);
  const pppWave = keep(ppp, WAVE);
  const pppWaveRel = indexAt(pppWave, 1990);
  const pppLatamCountries = indexAt(
    keep(
      ppp,
      LATAM.filter((iso) => iso !== "LCN" && !LATAM_SKIP_INDEX.has(iso)),
    ),
    1990,
  );
  const pppLatamMean = meanByYear(pppLatamCountries, {
    iso: "MEAN",
    name: "América Latina",
    exclude: new Set(["BRA"]),
  });
  const pppLatamRel = [...pppLatamCountries, ...pppLatamMean];
  const latamPppIsos = LATAM.filter((iso) => iso !== "LCN" && !LATAM_SKIP_INDEX.has(iso));
  const latamPovIsos = LATAM.filter((iso) => iso !== "LCN");
  const clubPpp = lastGroup(ppp90rel, club90);
  const latamPpp = lastGroup(pppLatamCountries, latamPppIsos);
  const prod90rel = indexAt(keep(prod, club90), 1991);
  const prodWave = keep(prod, WAVE);
  const prodWaveRel = indexAt(prodWave, 1991);
  const rq90 = keep(rq, club90);
  const rq90rel = minusBase(rq90, 1996);
  const gini90 = keep(gini, club90);
  const gini90rel = minusFirst(gini90);
  const sav90 = keep(sav, club90);
  const mfg90 = keep(mfg, club90);
  const rl90 = keep(rl, club90);
  const rl90rel = minusBase(rl90, 1996);
  const totWave = keep(tot, WAVE);
  const tfp90rel = indexAt(keep(tfp, club90), 1990);
  const tfpLatamRel = indexAt(keep(tfp, latamPppIsos), 1990);
  const clubTfp = lastGroup(tfp90rel, club90);
  const latamTfp = lastGroup(tfpLatamRel, latamPppIsos);
  const poverty = pov.filter((d) => d.year >= 1995);
  const povLatamCountries = keep(
    poverty,
    LATAM.filter((iso) => iso !== "LCN"),
  );
  const povLatamMean = meanByYear(povLatamCountries, {
    iso: "MEAN",
    name: "América Latina",
    exclude: new Set(["BRA"]),
  });
  const clubPovLast = lastGroup(poverty, club90, undefined, { minYear: 2020 });
  const latamPovLast = lastGroup(poverty, latamPovIsos, undefined, { minYear: 2020 });
  const pov90 = [...keep(poverty, club90), ...povLatamMean];
  const pov90rel = minusFirst(keep(pov, [...club90, "UMC"]));
  const povertyIsos = [...new Set([...club90, ...LATAM, ...WAVE])].filter(
    (iso) => !["LCN", "UMC"].includes(iso),
  );
  const povertyCountries = povertyIsos
    .map((iso) => {
      const start = meanInWindow(poverty, iso, 2001, 2005);
      const boomEnd = meanInWindow(poverty, iso, 2008, 2012);
      const recent = meanInWindow(poverty, iso, 2020, 2024);
      if (start == null || boomEnd == null || recent == null) return;
      return {
        iso,
        name: NAMES[iso] ?? iso,
        boom: start - boomEnd,
        after: boomEnd - recent,
      };
    })
    .filter((d) => d)
    .sort((a, b) => b.boom - a.boom || a.name.localeCompare(b.name, "pt-BR"));
  const povertyGroup = (name, isos) => {
    const members = povertyCountries.filter((d) => d.iso !== "BRA" && isos.includes(d.iso));
    return {
      name,
      boom: members.reduce((sum, d) => sum + d.boom, 0) / members.length,
      after: members.reduce((sum, d) => sum + d.after, 0) / members.length,
      group: true,
    };
  };
  const povertyLatam = povertyGroup("América Latina sem Brasil", LATAM);
  const povertyExporters = povertyGroup("Exportadores sem Brasil", WAVE);
  const povertyBrazil = povertyCountries.find((d) => d.iso === "BRA");
  const povertyTable = [...povertyCountries, povertyLatam, povertyExporters];
  const waveBoom = deltaPct(pppWave, 2003, 2010);
  const waveFull = deltaPct(pppWave, 1990, 2024);
  const waveBeatenBoom = beatenNames(waveBoom, "BRA");
  const waveBeatenFull = beatenNames(waveFull, "BRA");
  const joinSpendPisa = (spend) =>
    [...new Set(pisaMath.map((d) => d.iso))]
      .filter((iso) => !SKIP.has(iso))
      .map((iso) => {
        const e = last(spend, iso);
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
      .filter((d) => d);

  return {
    namesOf,
    club90,
    ppp90,
    ppp90rel,
    pppWaveRel,
    pppLatamRel,
    prod90rel,
    prodWaveRel,
    inv,
    sav90,
    mfg90,
    trd,
    rq90,
    rq90rel,
    rl90,
    rl90rel,
    totWave,
    tfp90rel,
    days90: keep(days, club90).filter((d) => d.year >= 2013),
    days2019: snapshot(days, 2019, DAYS_2019),
    hicDays: at(days, "OWID_HIC", 2019),
    lacDays: at(days, "WB_LAC", 2019),
    efw90: keep(efw, club90).filter((d) => d.year >= 2000),
    pisa90: keep(pisaMath, [...club90, "OECD"]),
    edu90: keep(edu, club90),
    gini90,
    gini90rel,
    pov90,
    pov90rel,
    povertyTable,
    povertyBrazil,
    povertyLatam,
    povertyExporters,
    hunger90: keep(hunger, club90),
    waveBoom,
    waveBraBoom: last(waveBoom, "BRA")?.value,
    waveBraRank: [...waveBoom].sort((a, b) => b.value - a.value).findIndex((d) => d.iso === "BRA") + 1,
    waveBoomN: waveBoom.length,
    waveBeatenBoom,
    waveBeatenFull,
    waveBraRel: last(pppWaveRel, "BRA")?.value,
    waveRusRel: last(pppWaveRel, "RUS")?.value,
    prodWaveBoom: deltaPct(prodWave, 2003, 2010),
    invGrowth: club90
      .filter((iso) => !SKIP.has(iso))
      .map((iso) => {
        const invMean = meanOf(inv, iso);
        const pppRel = last(ppp90rel, iso)?.value;
        if (invMean == null || pppRel == null) return;
        return { iso, name: NAMES[iso] ?? iso, inv: invMean, ppp: pppRel };
      })
      .filter((d) => d),
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
    pupilBra: last(pupil, "BRA"),
    pupilPol: last(pupil, "POL"),
    pupilKor: last(pupil, "KOR"),
    braInvMean: meanOf(inv, "BRA"),
    polInvMean: meanOf(inv, "POL"),
    korInvMean: meanOf(inv, "KOR"),
    braSav: last(sav, "BRA"),
    polSav: last(sav, "POL"),
    korSav: last(sav, "KOR"),
    umcSav: last(sav, "UMC"),
    braMfg: last(mfg, "BRA"),
    polMfg: last(mfg, "POL"),
    korMfg: last(mfg, "KOR"),
    chlMfg: last(mfg, "CHL"),
    mfgBra90: at(mfg, "BRA", 1990),
    mfgKor90: at(mfg, "KOR", 1990),
    bra90rel: last(ppp90rel, "BRA")?.value,
    pol90rel: last(ppp90rel, "POL")?.value,
    kor90rel: last(ppp90rel, "KOR")?.value,
    zaf90rel: last(ppp90rel, "ZAF")?.value,
    latamMeanRel: last(pppLatamMean, "MEAN")?.value,
    clubPpp,
    latamPpp,
    clubTfp,
    latamTfp,
    clubPovLast,
    latamPovLast,
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
    braTfpRel: last(tfp90rel, "BRA")?.value,
    polTfpRel: last(tfp90rel, "POL")?.value,
    korTfpRel: last(tfp90rel, "KOR")?.value,
    zafTfpRel: last(tfp90rel, "ZAF")?.value,
    totBra: last(tot, "BRA"),
    totChl: last(tot, "CHL"),
    totPer: last(tot, "PER"),
    totBra11: at(tot, "BRA", 2011),
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
    braGiniRel: last(gini90rel, "BRA")?.value,
    chlGiniRel: last(gini90rel, "CHL")?.value,
    polGiniRel: last(gini90rel, "POL")?.value,
    korGiniRel: last(gini90rel, "KOR")?.value,
    zafGiniRel: last(gini90rel, "ZAF")?.value,
    braPov: last(pov, "BRA"),
    umcPov: last(pov, "UMC"),
    polPov: last(pov, "POL"),
    korPov: last(pov, "KOR"),
    zafPov: last(pov, "ZAF"),
    povBra90: at(pov, "BRA", 1990),
    povBra95: at(pov, "BRA", 1995),
    braPovRel: last(pov90rel, "BRA")?.value,
    chlPovRel: last(pov90rel, "CHL")?.value,
    umcPovRel: last(pov90rel, "UMC")?.value,
    zafPovRel: last(pov90rel, "ZAF")?.value,
    braHunger: last(hunger, "BRA"),
    umcHunger: last(hunger, "UMC"),
    zafHunger: last(hunger, "ZAF"),
    hungerBra01: at(hunger, "BRA", 2001),
    braRq: last(rq, "BRA"),
    polRq: last(rq, "POL"),
    korRq: last(rq, "KOR"),
    chlRq: last(rq, "CHL"),
    braRqRel: last(rq90rel, "BRA")?.value,
    polRqRel: last(rq90rel, "POL")?.value,
    korRqRel: last(rq90rel, "KOR")?.value,
    chlRqRel: last(rq90rel, "CHL")?.value,
    braRl: last(rl, "BRA"),
    polRl: last(rl, "POL"),
    korRl: last(rl, "KOR"),
    chlRl: last(rl, "CHL"),
    braRlRel: last(rl90rel, "BRA")?.value,
    polRlRel: last(rl90rel, "POL")?.value,
    korRlRel: last(rl90rel, "KOR")?.value,
    chlRlRel: last(rl90rel, "CHL")?.value,
    braDays: last(days, "BRA"),
    chlDays: last(days, "CHL"),
    polDays: last(days, "POL"),
    korDays: last(days, "KOR"),
    braEfw: last(efw, "BRA"),
    chlEfw: last(efw, "CHL"),
    polEfw: last(efw, "POL"),
    korEfw: last(efw, "KOR"),
    spendPisa: joinSpendPisa(edu),
    spendPisaPupil: joinSpendPisa(pupil),
    scorecard: [
      [
        "PPP 1990 = 100",
        fmtIdx(last(ppp90rel, "BRA")?.value),
        fmtIdx(last(ppp90rel, "POL")?.value),
        fmtIdx(last(ppp90rel, "KOR")?.value),
        fmtIdx(last(ppp90rel, "ZAF")?.value),
      ],
      [
        "Prod. 1991 = 100",
        fmtIdx(last(prod90rel, "BRA")?.value),
        fmtIdx(last(prod90rel, "POL")?.value),
        fmtIdx(last(prod90rel, "KOR")?.value),
        fmtIdx(last(prod90rel, "ZAF")?.value),
      ],
      [
        "TFP 1990 = 100",
        fmtIdx(last(tfp90rel, "BRA")?.value),
        fmtIdx(last(tfp90rel, "POL")?.value),
        fmtIdx(last(tfp90rel, "KOR")?.value),
        fmtIdx(last(tfp90rel, "ZAF")?.value),
      ],
      [
        "Investimento médio",
        fmtPct(meanOf(inv, "BRA")),
        fmtPct(meanOf(inv, "POL")),
        fmtPct(meanOf(inv, "KOR")),
        fmtPct(meanOf(inv, "ZAF")),
      ],
      [
        "Indústria",
        fmtPct(last(mfg, "BRA")?.value),
        fmtPct(last(mfg, "POL")?.value),
        fmtPct(last(mfg, "KOR")?.value),
        fmtPct(last(mfg, "ZAF")?.value),
      ],
      [
        "Comércio",
        fmtPct(last(trd, "BRA")?.value),
        fmtPct(last(trd, "POL")?.value),
        fmtPct(last(trd, "KOR")?.value),
        fmtPct(last(trd, "ZAF")?.value),
      ],
      [
        "RQ vs 1996",
        fmt2(last(rq90rel, "BRA")?.value),
        fmt2(last(rq90rel, "POL")?.value),
        fmt2(last(rq90rel, "KOR")?.value),
        fmt2(last(rq90rel, "ZAF")?.value),
      ],
      [
        "Rule of Law vs 1996",
        fmt2(last(rl90rel, "BRA")?.value),
        fmt2(last(rl90rel, "POL")?.value),
        fmt2(last(rl90rel, "KOR")?.value),
        fmt2(last(rl90rel, "ZAF")?.value),
      ],
      [
        "Gini vs 1º",
        fmtGini(last(gini90rel, "BRA")?.value),
        fmtGini(last(gini90rel, "POL")?.value),
        fmtGini(last(gini90rel, "KOR")?.value),
        fmtGini(last(gini90rel, "ZAF")?.value),
      ],
      [
        "PISA math",
        fmtIdx(last(pisaMath, "BRA")?.value),
        fmtIdx(last(pisaMath, "POL")?.value),
        fmtIdx(last(pisaMath, "KOR")?.value),
        fmtIdx(last(pisaMath, "ZAF")?.value),
      ],
    ],
    fmtX,
    fmtPct,
    fmtIdx,
    fmtGini,
    fmt2,
    fmtDays,
  };
}
