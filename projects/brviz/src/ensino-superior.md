---
toc:
  label: Nesta página
---

# Ensino superior: irrelevante?

Esta página acompanha o [relatório](./) e a página de [Educação](./educacao). Ela testa seis afirmações comuns sobre as universidades brasileiras, uma a uma, contra os dados. A comparação é com o mesmo grupo de pares — países cuja renda per capita em 1990 ficava entre 65% e 135% da brasileira.

O resumo: quatro afirmações se sustentam, total ou parcialmente; uma é falsa na forma em que costuma ser feita; e uma não pode ser verificada com os dados disponíveis. No fim, uma seção olha para o ProUni: quanto custa, para onde vão as bolsas e quantos bolsistas se formam.

```js
import { load, series, last, NAMES } from "./components/data.js";
import { barDelta } from "./components/plots.js";

const wdi = await FileAttachment("./data/wdi.csv").csv({ typed: true });
const pisa = await FileAttachment("./data/pisa.csv").csv({ typed: true });
const uis = await FileAttachment("./data/uis.csv").csv({ typed: true });
const oa = await FileAttachment("./data/openalex.csv").csv({ typed: true });
const prouni = await FileAttachment("./data/prouni.csv").csv({ typed: true });
const d = load(wdi, pisa);

const club = d.club90.filter((iso) => !["UMC", "LCN"].includes(iso));
const MIN_YEAR = 2018;
const OA_FROM = 2015;
const OA_TO = 2022;

const fmt0 = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const fmt1 = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
const fmt2 = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }));
const pct1 = (x) => `${fmt1(x)}%`;
const usd = (x) => `US$ ${fmt0(x)}`;
const nm = (iso) => (iso === "WORLD" ? "Mundo" : NAMES[iso] ?? iso);
const listPt = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`);
const braColor = () => getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";

function recent(rows, iso) {
  const row = last(rows, iso);
  return row && row.year >= MIN_YEAR ? row : undefined;
}

function bars(valueOf, isos) {
  return isos
    .map((iso) => {
      const v = valueOf(iso);
      if (v == null || !Number.isFinite(v.value ?? v)) return;
      const value = v.value ?? v;
      return { iso, name: nm(iso), value, year: v.year, tone: iso === "BRA" ? "bra" : iso === "WORLD" ? "group" : "peer" };
    })
    .filter((r) => r);
}

function rankOf(rows, iso = "BRA") {
  const sorted = rows.filter((r) => r.tone !== "group").sort((a, b) => b.value - a.value);
  return { pos: sorted.findIndex((r) => r.iso === iso) + 1, n: sorted.length };
}
const rankTxt = ({ pos, n }) => `${pos}º de ${n}`;
const peersAbove = (rows) => {
  const bra = rows.find((r) => r.iso === "BRA").value;
  return rows.filter((r) => r.tone === "peer" && r.value > bra).sort((a, b) => b.value - a.value).map((r) => r.name);
};
const peersBelow = (rows) => {
  const bra = rows.find((r) => r.iso === "BRA").value;
  return rows.filter((r) => r.tone === "peer" && r.value < bra).sort((a, b) => b.value - a.value).map((r) => r.name);
};

// --- patentes, P&D, pesquisadores, artigos (Banco Mundial)
const pop = series("pop", wdi);
const popAt = (iso, year) => pop.find((r) => r.iso === iso && r.year === year)?.value;
function perMillion(metric) {
  return series(metric, wdi)
    .map((r) => ({ ...r, value: popAt(r.iso, r.year) ? (r.value / popAt(r.iso, r.year)) * 1e6 : undefined }))
    .filter((r) => Number.isFinite(r.value));
}
const patents = perMillion("patents_res");
const articles = perMillion("sci_articles");
const rnd = series("rnd", wdi);
const researchers = series("researchers", wdi);

const patentBars = bars((iso) => recent(patents, iso), club);
const patentRank = rankOf(patentBars);
const patentBra = patentBars.find((r) => r.iso === "BRA");
const patentOf = (iso) => patentBars.find((r) => r.iso === iso)?.value;
const rndBars = bars((iso) => recent(rnd, iso), club);
const rndRank = rankOf(rndBars);
const rndBra = rndBars.find((r) => r.iso === "BRA");
const researchersBra = last(researchers, "BRA");
const articleBars = bars((iso) => recent(articles, iso), club);
const articleRank = rankOf(articleBars);
const articleBra = articleBars.find((r) => r.iso === "BRA");
const articleRawBra = last(series("sci_articles", wdi), "BRA");

// --- citações (OpenAlex)
const oaWindow = oa.filter((r) => r.year >= OA_FROM && r.year <= OA_TO);
const oaSum = d3.rollup(oaWindow, (v) => d3.sum(v, (r) => r.value), (r) => r.metric, (r) => r.iso);
const oaGet = (m, iso) => oaSum.get(m)?.get(iso);
const oaShare = (num, den) => (iso) => {
  const a = oaGet(num, iso);
  const b = oaGet(den, iso);
  return a != null && b ? (100 * a) / b : undefined;
};
const oaIsos = [...club, "WORLD"];
const topCore = bars(oaShare("oa_core_top10", "oa_core_articles"), oaIsos);
const topAll = bars(oaShare("oa_all_top10", "oa_all_articles"), oaIsos);
const coreShare = bars(oaShare("oa_core_articles", "oa_all_articles"), oaIsos);
const uncitedCore = bars(oaShare("oa_core_uncited", "oa_core_articles"), oaIsos);
const val = (rows, iso) => rows.find((r) => r.iso === iso)?.value;
const topCoreRank = rankOf(topCore);
const topAllRank = rankOf(topAll);
const coreShareRank = rankOf(coreShare);
const coreShareLow = coreShareRank.n - coreShareRank.pos + 1;
const braAll = oaGet("oa_all_articles", "BRA");
const braCore = oaGet("oa_core_articles", "BRA");
const worldAll = oaGet("oa_all_articles", "WORLD");

const oaYears = d3.range(OA_FROM - 10, OA_TO + 1);
const oaYear = d3.rollup(oa, (v) => v[0].value, (r) => r.metric, (r) => r.iso, (r) => r.year);
const yearShare = (iso, year) => {
  const a = oaYear.get("oa_core_top10")?.get(iso)?.get(year);
  const b = oaYear.get("oa_core_articles")?.get(iso)?.get(year);
  return a != null && b ? (100 * a) / b : undefined;
};
const gapRows = oaYears.flatMap((year) => {
  const world = yearShare("WORLD", year);
  if (!Number.isFinite(world)) return [];
  const peers = club.filter((iso) => iso !== "BRA").map((iso) => yearShare(iso, year)).filter(Number.isFinite);
  return [
    { year, line: "Brasil", value: yearShare("BRA", year) - world },
    { year, line: "Mediana dos pares", value: peers.length ? d3.median(peers) - world : undefined },
  ].filter((r) => Number.isFinite(r.value));
});
const gapAt = (year) => gapRows.find((r) => r.year === year && r.line === "Brasil")?.value;
const gapBest = d3.greatest(gapRows.filter((r) => r.line === "Brasil"), (r) => r.value);
const lastYearRank = rankOf(bars((iso) => yearShare(iso, OA_TO), club));
const fmtPp = (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${fmt1(Math.abs(x))} p.p.`;

function gapPlot(width) {
  const BRA = braColor();
  return Plot.plot({
    width,
    height: Math.round(Math.max(260, Math.min(360, width * 0.6))),
    marginLeft: 44,
    x: { label: null, tickFormat: "d" },
    y: { label: "diferença para o mundo (pontos percentuais)", grid: true },
    color: { legend: true, domain: ["Brasil", "Mediana dos pares"], range: [BRA, "#6ba8d4"] },
    marks: [
      Plot.ruleY([0], { stroke: "#94a3b8", strokeDasharray: "4,3" }),
      Plot.lineY(gapRows, { x: "year", y: "value", stroke: "line", strokeWidth: 2.2 }),
      Plot.dot(gapRows, { x: "year", y: "value", fill: "line", r: 3, tip: true, title: (r) => `${r.line}, ${r.year}: ${fmtPp(r.value)}` }),
    ],
  });
}

// --- gasto (UNESCO)
const tertGdp = series("uis_tert_gdp", uis);
const eduGdp = series("uis_edu_gdp", uis);
const tertBars = bars((iso) => recent(tertGdp, iso), club);
const tertRank = rankOf(tertBars);
const tertBra = tertBars.find((r) => r.iso === "BRA");
const tertMedian = d3.median(tertBars.filter((r) => r.iso !== "BRA"), (r) => r.value);
const eduBars = bars((iso) => recent(eduGdp, iso), club);
const eduRank = rankOf(eduBars);
const eduBra = eduBars.find((r) => r.iso === "BRA");

const OECD_PER_STUDENT = [
  { iso: "BRA", name: "Brasil, anos iniciais do fundamental", value: 3668, tone: "bra" },
  { iso: "BRA", name: "Brasil, superior", value: 13569, tone: "bra" },
  { iso: "OECD", name: "OCDE, anos iniciais do fundamental", value: 11914, tone: "group" },
  { iso: "OECD", name: "OCDE, superior", value: 17138, tone: "group" },
];
const ratioBra = 13569 / 3668;
const ratioOecd = 17138 / 11914;

// --- alfabetismo funcional (INAF 2024)
const INAF_LEVELS = ["Analfabeto", "Rudimentar", "Elementar", "Intermediário", "Proficiente"];
const INAF = [
  ["População de 15 a 64 anos", [7, 22, 36, 25, 10]],
  ["Com superior completo ou mais", [1, 11, 27, 38, 24]],
].flatMap(([group, values]) => values.map((value, i) => ({ group, level: INAF_LEVELS[i], value })));

function inafPlot(width) {
  return Plot.plot({
    width,
    height: 150,
    marginLeft: Math.min(220, Math.max(130, width * 0.3)),
    x: { label: "% das pessoas", domain: [0, 100] },
    y: { label: null, domain: ["Com superior completo ou mais", "População de 15 a 64 anos"] },
    color: { legend: true, domain: INAF_LEVELS, range: ["#b91c1c", "#f87171", "#cbd5e1", "#93c5fd", "#1e3a8a"] },
    marks: [
      Plot.barX(INAF, Plot.stackX({ y: "group", x: "value", fill: "level", order: INAF_LEVELS, tip: true, title: (r) => `${r.group}\n${r.level}: ${r.value}%` })),
      Plot.text(INAF, Plot.stackX({ y: "group", x: "value", z: "level", order: INAF_LEVELS, text: (r) => (r.value >= 6 ? `${r.value}%` : ""), fill: "white" })),
    ],
  });
}

// --- evasão (INEP 2024)
const EVASAO = [
  { iso: "BRA", name: "Sistema inteiro", value: 17.5, tone: "bra" },
  { iso: "x1", name: "Presencial", value: 9.5, tone: "peer" },
  { iso: "x2", name: "A distância (EaD)", value: 24.1, tone: "peer" },
  { iso: "x3", name: "Rede pública", value: 8.0, tone: "group" },
  { iso: "x4", name: "Rede privada", value: 19.9, tone: "group" },
];

// --- ProUni (MEC, bolsas concedidas 2015–2020)
const puTotal = new Map(prouni.filter((r) => r.metric === "bolsas").map((r) => [r.year, r.value]));
const puEad = new Map(prouni.filter((r) => r.metric === "bolsas_ead").map((r) => [r.year, r.value]));
const puYears = [...puTotal.keys()].sort();
const puY0 = puYears[0];
const puY1 = puYears.at(-1);
const eadShare = (y) => (100 * puEad.get(y)) / puTotal.get(y);
const puAll = d3.sum(puTotal.values());
const puCourses = d3
  .rollups(prouni.filter((r) => r.metric === "bolsas_curso" && r.key !== "OUTROS"), (v) => d3.sum(v, (r) => r.value), (r) => r.key)
  .map(([key, n]) => ({ key, share: (100 * n) / puAll }))
  .sort((a, b) => b.share - a.share);
const puTop4 = d3.sum(puCourses.slice(0, 4), (r) => r.share);
// Diferença salarial bruta entre formados e evadidos do ProUni, em salários mínimos por mês
// (Almeida e Lourenço, Cadernos de Finanças Públicas, 2022, Tabela 5). null = curso fora da tabela.
const PU_GAIN = {
  "ADMINISTRAÇÃO": 0.76, "DIREITO": 0.53, "PEDAGOGIA": 0, "CIÊNCIAS CONTÁBEIS": 0.99, "ENFERMAGEM": 1.19,
  "EDUCAÇÃO FÍSICA": null, "ENGENHARIA CIVIL": 1.25, "PSICOLOGIA": 0.39, "GESTÃO DE RECURSOS HUMANOS": null,
  "FISIOTERAPIA": 0.21, "COMUNICAÇÃO SOCIAL": 0.77, "ENGENHARIA DE PRODUÇÃO": 1.07, "ARQUITETURA E URBANISMO": 0.73,
  "SERVIÇO SOCIAL": null, "FARMÁCIA": 1.34,
};
const titleCase = (s) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, sp, c) => sp + c.toUpperCase()).replace(/\b(De|E|Da|Do)\b/g, (w) => w.toLowerCase());
const gainLabel = (key) => {
  const g = PU_GAIN[key];
  if (g === undefined || g === null) return "sem estimativa";
  if (g === 0) return "ganho não significativo";
  return `+${g.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} SM/mês`;
};
const PU_COST = 6000;
const PU_COST_PPP = Math.round(PU_COST / 2.265 / 100) * 100;

function puCoursePlot(width) {
  const tier = (g) => (g == null ? "none" : g < 0.5 ? "weak" : "ok");
  const rows = puCourses.map((r) => ({ ...r, name: titleCase(r.key), gain: gainLabel(r.key), tier: tier(PU_GAIN[r.key]) }));
  return Plot.plot({
    width,
    height: 30 * rows.length + 50,
    marginLeft: Math.min(200, Math.max(130, width * 0.3)),
    marginRight: 150,
    x: { label: `% das bolsas concedidas, ${puY0}–${puY1}`, grid: true },
    y: { label: null, domain: rows.map((r) => r.name) },
    marks: [
      Plot.barX(rows.filter((r) => r.tier === "ok"), { y: "name", x: "share", fill: "#6ba8d4" }),
      Plot.barX(rows.filter((r) => r.tier === "weak"), { y: "name", x: "share", fill: "#b45309" }),
      Plot.barX(rows.filter((r) => r.tier === "none"), { y: "name", x: "share", fill: "#aaa" }),
      Plot.text(rows, { y: "name", x: "share", text: (r) => `${r.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${r.gain}`, dx: 6, textAnchor: "start", fill: "currentColor", fontSize: 11 }),
      Plot.ruleX([0]),
    ],
  });
}

function puEadPlot(width) {
  const rows = puYears.flatMap((y) => [
    { year: y, kind: "Presencial", value: (puTotal.get(y) - puEad.get(y)) / 1000 },
    { year: y, kind: "A distância", value: puEad.get(y) / 1000 },
  ]);
  return Plot.plot({
    width,
    height: 280,
    marginLeft: 56,
    marginTop: 40,
    x: { label: null, tickFormat: "d", type: "band" },
    y: { label: "bolsas concedidas (mil)", grid: true, domain: [0, 280] },
    color: { legend: true, domain: ["Presencial", "A distância"], range: ["#6ba8d4", "#b45309"] },
    marks: [
      Plot.barY(rows, { x: "year", y: "value", fill: "kind", order: ["Presencial", "A distância"], tip: true }),
      Plot.text(puYears, { x: (y) => y, y: (y) => puTotal.get(y) / 1000, text: (y) => `${eadShare(y).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% EaD`, dy: -8, fontSize: 11 }),
    ],
  });
}

function lede(kicker, title, value, neg = false) {
  return html`<div class="lede">
    <div class="lede-kicker">${kicker}</div>
    <div class="lede-title">${title}</div>
    <div class="lede-big ${neg ? "neg" : ""}">${value}</div>
  </div>`;
}

function verdict(n, claim, tag, tone, text) {
  const colors = { sim: "#b91c1c", parte: "#b45309", nao: "#15803d", sem: "#64748b" };
  return html`<div style="display:grid;grid-template-columns:2rem 1fr;gap:.25rem .75rem;padding:.6rem 0;border-bottom:1px solid var(--theme-foreground-faintest)">
    <div style="font-weight:700;font-size:1.2rem;color:var(--theme-foreground-muted)">${n}</div>
    <div>
      <div><strong>${claim}</strong> <span style="display:inline-block;margin-left:.4rem;padding:0 .45rem;border-radius:4px;font-size:.8rem;font-weight:600;color:white;background:${colors[tone]}">${tag}</span></div>
      <div style="color:var(--theme-foreground-muted);font-size:.92rem">${text}</div>
    </div>
  </div>`;
}
```

```js
html`<div class="lede-grid">
  ${lede("Desistência", "ingressantes de 2015 que deixaram o curso em 10 anos", "60%", true)}
  ${lede("Analfabetismo funcional", "entre quem tem diploma de nível superior", "12%", true)}
  ${lede("Artigos muito citados", `% no topo 10%, revistas internacionais, ${OA_FROM}–${OA_TO}`, pct1(val(topCore, "BRA")), true)}
  ${lede("Gasto por aluno público", "superior ÷ anos iniciais do fundamental", `${fmt1(ratioBra)}×`, true)}
</div>`
```

## As seis afirmações

```js
html`<div>
  ${verdict(1, "Somos irrelevantes em citações internacionais e patentes", "em parte", "parte",
    `Em volume, o Brasil está longe de irrelevante: é o maior produtor de artigos do grupo. No impacto, fica abaixo da média mundial e atrás de quase todos os pares. Em patentes por habitante, fica no meio do grupo, mas muito atrás de Coreia, Turquia e Polônia.`)}
  ${verdict(2, "Gastamos muito do PIB com ensino superior", "não, mas…", "nao",
    `O gasto público com ensino superior (${fmt2(tertBra?.value)}% do PIB) está na mediana dos pares. O que chama atenção é o gasto por aluno da rede pública, ${fmt1(ratioBra)} vezes o de um aluno dos anos iniciais. Na OCDE, essa razão é ${fmt1(ratioOecd)}.`)}
  ${verdict(3, "Muitos formados são analfabetos funcionais", "sim", "sim",
    `12% de quem tem diploma superior é analfabeto funcional, e só 24% chegam ao nível proficiente.`)}
  ${verdict(4, "A evasão é alta", "sim", "sim",
    `60% dos ingressantes de 2015 desistiram do curso em dez anos. A evasão anual subiu de 11% para 17,5% desde 2010, puxada pelo ensino a distância.`)}
  ${verdict(5, "O volume é inflado por publicação fatiada (\"salame\")", "sem dados", "sem",
    `Não existe medida direta. O que os dados mostram é outra coisa: quase dois terços dos artigos brasileiros saem fora das revistas internacionais de referência.`)}
  ${verdict(6, "Gastamos muito com cursos sem retorno nem demanda", "em parte", "parte",
    `Na média, o diploma rende muito: 148% a mais de salário, contra 54% na OCDE. Mas 27% das vagas novas da rede pública ficam vazias, e o retorno varia muito entre cursos.`)}
</div>`
```

## 1. Citações e patentes

### Volume não falta

O Brasil publicou ${fmt1(braAll / 1e6)} milhão de artigos entre ${OA_FROM} e ${OA_TO}, segundo o [OpenAlex](https://openalex.org), uma base aberta que indexa cerca de ${fmt0(worldAll / 1e6)} milhões de artigos no período. É o maior volume do grupo de pares e cerca de ${fmt1((100 * braAll) / worldAll)}% do total mundial.

Por habitante, o quadro muda. Pela contagem que o Banco Mundial publica (artigos em revistas indexadas), o Brasil teve ${fmt0(articleRawBra?.value)} artigos em ${articleRawBra?.year}, ou ${fmt0(articleBra?.value)} por milhão de habitantes: ${rankTxt(articleRank)} no grupo. ${listPt(peersAbove(articleBars))} publicam mais por habitante.

${resize((width) => barDelta(articleBars, {width, xLabel: "artigos científicos por milhão de habitantes (Banco Mundial)", format: fmt0}))}

### O impacto fica abaixo do mundo e dos pares

Volume não diz se alguém lê o que foi publicado. A medida usada aqui é a parcela dos artigos que estão entre os 10% mais citados do mundo na mesma área e no mesmo ano. Num país "na média", essa parcela fica perto de 10%; se for maior, o país produz mais artigos influentes do que o esperado.

Contando todas as revistas, só ${pct1(val(topAll, "BRA"))} dos artigos brasileiros chegam a esse grupo, abaixo do mundo (${pct1(val(topAll, "WORLD"))}). É o ${rankTxt(topAllRank)} entre os pares.

Esse número é injusto com o Brasil, porque mistura revistas nacionais, que quase ninguém cita fora do país. Restringindo às revistas internacionais de referência (as fontes "core" do OpenAlex), a parcela sobe para ${pct1(val(topCore, "BRA"))}, ainda abaixo do mundo (${pct1(val(topCore, "WORLD"))}). O Brasil fica em ${rankTxt(topCoreRank)} no grupo. Só ${listPt(peersBelow(topCore).filter((n) => n !== "Mundo"))} ficam abaixo.

${resize((width) => barDelta(topCore, {width, xLabel: `% dos artigos entre os 10% mais citados, revistas de referência, ${OA_FROM}–${OA_TO}`, format: pct1}))}

A trajetória tem duas fases. O gráfico abaixo mostra a distância entre a parcela brasileira de artigos muito citados e a mundial, nas revistas de referência. A linha tracejada é a média mundial. Até meados da década passada, o Brasil se aproximou dela: a distância passou de ${fmtPp(gapAt(OA_FROM - 10))} em ${OA_FROM - 10} para ${fmtPp(gapBest.value)} em ${gapBest.year}. Desde então, voltou a abrir: ${fmtPp(gapAt(OA_TO))} em ${OA_TO}, o ${lastYearRank.pos}º lugar entre ${lastYearRank.n} países do grupo naquele ano. A mediana dos outros pares está acima do mundo desde 2009.

${resize((width) => gapPlot(width))}

Os anos mais recentes ainda vão acumular citações, e o resultado de ${OA_TO} pode melhorar. Mas a piora começa em 2017, e esses anos já tiveram tempo para acumular citações.

<div class="takeaway">
  <strong>Irrelevante, não. Abaixo do esperado, sim.</strong>
  <span>O Brasil produz muito e tem pesquisa de nível internacional. Mas, artigo por artigo, é citado menos do que o mundo e menos do que países como Chile, Colômbia, África do Sul e Malásia.</span>
</div>

### Patentes: no meio do grupo, longe dos que decolaram

Patentes medem outra coisa: a pesquisa que vira produto. Em ${patentBra?.year}, residentes no Brasil depositaram ${fmt0(patentBra?.value)} pedidos de patente por milhão de habitantes. É o ${rankTxt(patentRank)} no grupo, à frente de ${listPt(peersBelow(patentBars))}.

A distância para quem decolou é enorme: a Turquia tem ${fmt0(patentOf("TUR") / patentBra?.value)} vezes mais pedidos por habitante; a Polônia, ${fmt0(patentOf("POL") / patentBra?.value)} vezes; a Coreia, ${fmt0(patentOf("KOR") / patentBra?.value)} vezes. A Coreia fica fora do gráfico abaixo porque, com ${fmt0(patentOf("KOR"))} pedidos por milhão, achataria todas as outras barras.

${resize((width) => barDelta(patentBars.filter((r) => r.iso !== "KOR"), {width, xLabel: "pedidos de patente de residentes por milhão de habitantes", format: fmt0}))}

O gasto com pesquisa e desenvolvimento conta a mesma história. O Brasil investe ${fmt2(rndBra?.value)}% do PIB (${rankTxt(rndRank)} no grupo), mais do que a maioria dos vizinhos latino-americanos. O último dado de pesquisadores, de ${researchersBra?.year}, era ${fmt0(researchersBra?.value)} por milhão de habitantes, contra mais de 2.500 na Turquia e mais de 3.500 na Polônia hoje.

${resize((width) => barDelta(rndBars, {width, xLabel: "gasto em P&D (% do PIB)", format: fmt2}))}

## 2. Gasto: o problema não é quanto, é para quem

O governo brasileiro gasta ${fmt2(tertBra?.value)}% do PIB com ensino superior, segundo a UNESCO (${tertBra?.year}). A mediana dos outros pares é ${fmt2(tertMedian)}%. O Brasil fica em ${rankTxt(tertRank)}, abaixo de ${listPt(peersAbove(tertBars))}. Nessa medida, não há gasto excessivo.

${resize((width) => barDelta(tertBars, {width, xLabel: "gasto público com ensino superior (% do PIB)", format: fmt2}))}

O gasto com educação como um todo é alto: ${fmt2(eduBra?.value)}% do PIB, ${rankTxt(eduRank)} no grupo. O que distingue o Brasil é a divisão desse dinheiro.

Como 80% dos universitários brasileiros estão em faculdades privadas, o gasto público se concentra em poucos alunos. Pelos números da OCDE ([Education at a Glance 2024](https://www.oecd.org/en/publications/education-at-a-glance-2024_c00cad36-en.html)), o Brasil gasta ${usd(13569)} por ano com cada aluno de instituição pública de ensino superior, e ${usd(3668)} com cada aluno dos anos iniciais do fundamental: ${fmt1(ratioBra)} vezes mais. Na média da OCDE, a razão é ${fmt1(ratioOecd)}.

${resize((width) => barDelta(OECD_PER_STUDENT, {width, xLabel: "gasto por aluno de instituição pública (US$ PPC por ano)", format: usd, marginLeft: 230, xDomain: [0, 21000]}))}

O valor por universitário inclui pesquisa e, em muitos casos, hospitais universitários. Mesmo assim, a diferença é grande: um universitário da rede pública brasileira custa ${fmt0(100 * 13569 / 17138)}% do que custa na média da OCDE, enquanto uma criança do fundamental custa menos de um terço.

<div class="takeaway">
  <strong>A afirmação, como costuma ser feita, não se sustenta.</strong>
  <span>O Brasil não gasta uma parcela alta do PIB com ensino superior. Gasta muito por aluno da rede pública, em comparação com o pouco que gasta na educação básica.</span>
</div>

## 3. Diplomados que não leem bem

O [Indicador de Alfabetismo Funcional (INAF) 2024](https://alfabetismofuncional.org.br/wp-content/uploads/2026/04/relatorio-inaf-digital.pdf) aplica um teste de leitura e matemática do dia a dia a uma amostra da população de 15 a 64 anos. Quem fica nos dois níveis mais baixos é chamado de analfabeto funcional: consegue ler frases curtas, mas não entende um texto de média extensão nem resolve um problema simples com porcentagem.

Entre quem tem diploma de nível superior, 12% são analfabetos funcionais e outros 27% ficam no nível elementar. Só 24% são proficientes, ou seja, conseguem interpretar uma tabela com duas variáveis ou avaliar se uma notícia é verdadeira.

${resize((width) => inafPlot(width))}

O diploma melhora muito o resultado em relação ao resto da população (29% de analfabetos funcionais). Mas espera-se que um formado chegue ao topo da escala. No Brasil, quase 4 em cada 10 não chegam nem ao nível intermediário.

<div class="takeaway">
  <strong>A afirmação se sustenta.</strong>
  <span>Parte do problema vem de antes: o aluno chega à faculdade sem ter aprendido o básico, como mostra a página de <a href="./educacao">Educação</a>. A faculdade não corrige essa falha.</span>
</div>

## 4. Evasão

O [Censo da Educação Superior 2024](https://download.inep.gov.br/educacao_superior/censo_superior/documentos/2024/apresentacao_censo_da_educacao_superior_2024.pdf), do INEP, acompanha cada aluno desde o ingresso. Dos que entraram em 2015, 60% tinham desistido do curso dez anos depois, e só 39% tinham se formado. As turmas de 2010 a 2014 tiveram resultados parecidos. A conta de "desistência" inclui quem trocou de curso na mesma instituição, então parte desses alunos se formou em outra coisa.

A evasão anual do sistema subiu de 11,3% (de 2010 para 2011) para 17,5% (de 2023 para 2024). O ensino a distância, que em 2024 passou o presencial em número de matrículas, perde alunos num ritmo duas vezes e meia maior. A rede privada perde mais que a pública.

${resize((width) => barDelta(EVASAO, {width, xLabel: "alunos que abandonaram o sistema de 2023 para 2024 (%)", format: pct1, marginLeft: 150}))}

A OCDE ([Education at a Glance 2025](https://www.oecd.org/en/publications/education-at-a-glance-2025_1c0d9c79-en.html)) chega a números parecidos por outra conta. No Brasil, 25% dos alunos de bacharelado saem depois do primeiro ano, e só 49% se formam até três anos depois do prazo previsto, contra 70% na média da OCDE.

<div class="takeaway">
  <strong>A afirmação se sustenta.</strong>
  <span>A maioria de quem entra numa faculdade brasileira não se forma no curso em que entrou. E a evasão cresce, puxada pelo ensino a distância privado.</span>
</div>

## 5. Volume por publicação fatiada

A "publicação salame" é dividir uma pesquisa em vários artigos pequenos para aumentar a contagem. É um problema conhecido, frequentemente associado a sistemas de avaliação que contam artigos, como a avaliação da pós-graduação pela CAPES. Mas não existe medida internacional comparável. Para medir, seria preciso ler os artigos e verificar se repetem dados e métodos.

O que os dados mostram é um sinal parecido, mas diferente. Só ${pct1(val(coreShare, "BRA"))} dos artigos brasileiros saem em revistas internacionais de referência, contra ${pct1(val(coreShare, "WORLD"))} no mundo. É a ${coreShareLow}ª menor parcela entre os ${coreShareRank.n} países do grupo. O resto sai em revistas nacionais ou pouco seletivas, que inflam a contagem e quase não são citadas.

${resize((width) => barDelta(coreShare, {width, xLabel: `% dos artigos em revistas internacionais de referência, ${OA_FROM}–${OA_TO}`, format: pct1}))}

Dentro das revistas de referência, o Brasil não tem excesso de artigos ignorados: ${pct1(val(uncitedCore, "BRA"))} nunca foram citados, contra ${pct1(val(uncitedCore, "WORLD"))} no mundo. Se houvesse muito fatiamento ali, essa parcela seria mais alta.

<div class="takeaway">
  <strong>Não dá para confirmar nem descartar.</strong>
  <span>O volume brasileiro é inflado por artigos em revistas de pouca circulação. Isso é compatível com publicação fatiada, mas também com uma ciência voltada para dentro, que publica em português para leitores locais.</span>
</div>

## 6. Cursos sem retorno nem demanda

Na média, o diploma vale muito no Brasil. Segundo a OCDE, quem tem diploma superior ganha 148% a mais do que quem só tem ensino médio; na média da OCDE, 54%. É um dos maiores prêmios do mundo, e um sinal de que faltam diplomados: só 24% dos brasileiros de 25 a 34 anos têm diploma superior, contra 49% na OCDE.

Esse prêmio médio esconde muita diferença. Estudos brasileiros mostram que as engenharias pagam bem mais que as licenciaturas, que ficam no fim da lista. Mostram também que quem trabalha fora da área em que se formou ganha bem menos ([Centro de Gestão e Estudos Estratégicos](https://fnse.cgee.org.br); [Economia Aplicada](https://doi.org/10.11606/1413-8050/ea140616)).

O desperdício mais visível está nas vagas públicas. Segundo o Censo de 2024, 27,4% das vagas novas da rede pública ficaram sem aluno. Das mais de 177 mil vagas remanescentes da rede federal, que são as abertas por desistência, só 19% foram ocupadas. São cursos com professores e salas pagos e cadeiras vazias.

<div class="takeaway">
  <strong>Em parte.</strong>
  <span>"Sem retorno" não vale para o diploma em geral, que paga muito bem. Vale para parte dos cursos e das vagas: há oferta pública que não encontra aluno. Mas os dados públicos não permitem dizer quanto do gasto vai para esses cursos.</span>
</div>

## E o ProUni?

O ProUni dá bolsas em faculdades privadas a alunos de baixa renda que vieram da escola pública e fizeram o Enem. As faculdades não recebem dinheiro: em troca das bolsas, deixam de pagar alguns impostos federais. Desde 2005, segundo o [MEC](https://www.gov.br/mec/pt-br/prouni/resultados), foram 8,1 milhões de bolsas oferecidas, 3,8 milhões ocupadas e 1,6 milhão de formados.

### Custo por bolsista

Um estudo publicado na revista do Tesouro Nacional ([Almeida e Lourenço, 2022](https://publicacoes.tesouro.gov.br/index.php/cadernos/article/view/157)) somou os impostos que o governo deixou de cobrar entre 2005 e 2017: R$ 13,6 bilhões em valores de 2020. Dividido pelas bolsas ocupadas, dá cerca de R$ ${fmt0(PU_COST)} por bolsista por ano, ou perto de ${usd(PU_COST_PPP)} em dólares PPC. É ${fmt0(100 * PU_COST_PPP / 13569)}% do que o governo gasta com cada aluno de universidade pública pela conta da OCDE (${usd(13569)}).

A comparação favorece o ProUni mais do que deveria. O custo do aluno público inclui pesquisa e hospitais, e a faculdade privada absorve parte do custo da bolsa. Mesmo assim, a diferença é grande o bastante para ficar de pé.

O mesmo estudo seguiu os ex-bolsistas no mercado de trabalho formal. Quem se formou pelo ProUni ganha cerca de 30% a mais do que quem entrou pelo programa e largou o curso. Somando esse ganho de salário, os autores concluem que o programa já devolveu mais do que custou: R$ 38 bilhões a mais, num cenário conservador.

### Onde estão as bolsas

O dinheiro é público, mas quem escolhe os cursos é a faculdade. Entre ${puY0} e ${puY1}, quatro cursos ficaram com ${fmt0(puTop4)}% das bolsas: Administração, Direito, Pedagogia e Ciências Contábeis. O estudo comparou também, curso a curso, o salário de quem se formou com o de quem largou. Em Pedagogia, o terceiro curso com mais bolsas, a diferença não é significativa. Em Fisioterapia e Psicologia, é pequena. Em Enfermagem, Farmácia e engenharia, passa de um salário mínimo por mês.

${resize((width) => puCoursePlot(width))}

<p class="small muted">Barras laranja: cursos em que a diferença salarial entre formados e evadidos do ProUni é não significativa ou menor que meio salário mínimo. Barras cinza ("sem estimativa"): o curso não aparece na tabela do estudo.</p>

O peso do ensino a distância cresceu rápido. Em ${puY0}, ${fmt0(eadShare(puY0))}% das bolsas eram para cursos a distância; em ${puY1}, ${fmt0(eadShare(puY1))}%. Segundo o mesmo estudo, quem se forma a distância pelo ProUni ganha 7,6% menos do que quem se forma no presencial.

${resize((width) => puEadPlot(width))}

Faltam candidatos para as bolsas. Desde o início, menos da metade das bolsas oferecidas foi ocupada. Em 2024, segundo o Semesp ([O Globo](https://oglobo.globo.com/brasil/especial/20-anos-do-prouni-explosao-de-vagas-ociosas-e-na-modalidade-de-ensino-a-distancia-sao-desafio-ao-programa.ghtml)), só 26% das mais de 650 mil bolsas oferecidas encontraram aluno.

### Evasão

O bolsista do ProUni abandona menos o curso. Entre os alunos que entraram em 2014, 58% dos bolsistas tinham se formado dez anos depois, contra 36% dos alunos sem nenhum benefício, segundo o INEP. O estudo publicado pelo Tesouro chega a um resultado parecido e mostra que a bolsa integral aumenta a chance de formatura em relação à parcial.

A comparação não isola o efeito da bolsa. O bolsista precisou de nota mínima no Enem e escolheu o curso sabendo que não pagaria, então é um aluno diferente da média. Parte da diferença viria de qualquer jeito.

<div class="takeaway">
  <strong>Barato por aluno, mal direcionado.</strong>
  <span>O ProUni custa uma fração do aluno público, seus bolsistas se formam mais e, no conjunto, o programa se paga. Mas o governo não escolhe onde a bolsa vai: quase um terço delas fica em quatro cursos, um deles sem ganho salarial mensurável, e cada vez mais no ensino a distância, onde o retorno é menor. Os autores do estudo sugerem vincular a isenção a cursos com efeito no mercado de trabalho.</span>
</div>

## Limites

- **Citações.** O OpenAlex é mais amplo que as bases comerciais (Web of Science, Scopus) e inclui mais revistas nacionais. Por isso, as parcelas de "todas as revistas" e "referência" aparecem separadas. Um artigo com autores de dois países conta para os dois. Os anos mais recentes ainda acumulam citações.
- **Patentes.** Contam pedidos feitos por residentes ao escritório nacional de patentes (no Brasil, o INPI). Não medem patentes concedidas nem sua qualidade.
- **Gasto.** A UNESCO divide o gasto público por todos os alunos, públicos e privados. Como no Brasil 80% estão na rede privada, o gasto por aluno da UNESCO subestima o custo de um aluno público. Por isso, o custo por aluno vem da OCDE, que divide só pelos alunos das instituições públicas.
- **INAF.** A amostra de pessoas com diploma superior tem 583 entrevistados. As diferenças de poucos pontos não são significativas.
- **Evasão.** O INEP conta como desistente quem troca de curso, mesmo que se forme em outro.
- **ProUni.** O custo por bolsista divide a renúncia fiscal de 2005 a 2017 pelas bolsas ocupadas; não inclui o que a faculdade gasta por conta própria. A distribuição por curso usa as bolsas concedidas de ${puY0} a ${puY1}, com os nomes de curso normalizados (sem campus nem modalidade). Os ganhos salariais por curso são diferenças simples entre formados e evadidos do programa, não efeitos causais.
- **Grupo de pares.** Equador e Colômbia não têm parte das séries; os rankings usam só os países com dado desde ${MIN_YEAR}.

## Fontes

- **Artigos, patentes, P&D e pesquisadores**: [Banco Mundial, Indicadores de Desenvolvimento Mundial](https://databank.worldbank.org/source/world-development-indicators) (IP.JRN.ARTC.SC, IP.PAT.RESD, GB.XPD.RSDV.GD.ZS, SP.POP.SCIE.RD.P6).
- **Citações**: [OpenAlex](https://openalex.org), artigos de ${OA_FROM - 10} a ${OA_TO}, percentil de citações normalizado por área e ano.
- **Gasto público com educação**: [UNESCO Institute for Statistics](https://databrowser.uis.unesco.org) (XGDP.5T8.FSGOV, XGDP.FSGOV).
- **Gasto por aluno, conclusão, evasão no primeiro ano, prêmio salarial**: OCDE, [Education at a Glance 2024](https://www.oecd.org/en/publications/education-at-a-glance-2024_c00cad36-en.html) e [2025](https://www.oecd.org/en/publications/education-at-a-glance-2025_1c0d9c79-en.html).
- **Alfabetismo funcional**: [INAF 2024](https://alfabetismofuncional.org.br/wp-content/uploads/2026/04/relatorio-inaf-digital.pdf), Ação Educativa e Instituto Paulo Montenegro.
- **Evasão, trajetória e vagas**: INEP, [Censo da Educação Superior 2024](https://download.inep.gov.br/educacao_superior/censo_superior/documentos/2024/apresentacao_censo_da_educacao_superior_2024.pdf).
- **ProUni**: bolsas concedidas, dados abertos do MEC (lidos de uma [cópia no GitHub](https://github.com/quirinowelton/prouni-data-analytics-investigando-o-acesso-ao-ensino-superior), porque o portal do MEC bloqueia downloads automáticos); totais do programa, [MEC](https://www.gov.br/mec/pt-br/prouni/resultados); custo, retorno e salários por curso, Almeida e Lourenço, [Cadernos de Finanças Públicas, 2022](https://doi.org/10.55532/1806-8944.2022.157); ocupação em 2024, Semesp via [O Globo](https://oglobo.globo.com/brasil/especial/20-anos-do-prouni-explosao-de-vagas-ociosas-e-na-modalidade-de-ensino-a-distancia-sao-desafio-ao-programa.ghtml); dólar PPC, Banco Mundial (PA.NUS.PPP).
