---
toc:
  label: Nesta página
---

# Educação

Esta página abre a seção de educação do [relatório](./). O relatório compara o Brasil com países de renda parecida em 1990. Para educação, esse grupo engana: ele junta o Brasil a países que já aprendiam muito mais na primeira prova internacional. Aqui a comparação é com três grupos escolhidos pelo que importa para a escola.

```js
import { load, series, at, last, keep, NAMES } from "./components/data.js";
import { metricPlot, barDelta } from "./components/plots.js";

const wdi = await FileAttachment("./data/wdi.csv").csv({ typed: true });
const pisa = await FileAttachment("./data/pisa.csv").csv({ typed: true });
const intl = await FileAttachment("./data/edu_intl.csv").csv({ typed: true });
const d = load(wdi, pisa);

const math = series("pisa_math", pisa);
const read = series("pisa_read", pisa);
const sci = series("pisa_sci", pisa);
const gdp = series("gdp_pc_ppp", intl);
const cum = series("cum_6_15_ppp", intl);

const nm = (iso) => NAMES[iso] ?? iso;
const fmt0 = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const fmtSigned = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 0, signDisplay: "exceptZero" }));
const usd = (x) => (x == null ? "—" : `US$ ${(x / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`);
const listPt = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`);
const braColor = () => getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
const countries = [...new Set(math.map((r) => r.iso))].filter((iso) => iso !== "OECD");

const Y = last(math, "BRA").year;
const mathAt = (iso, year = Y) => at(math, iso, year);

// Grupo 1: mesma nota na primeira prova (até 2009), com folga de 35 pontos.
const START_GAP = 35;
const firstYear = (iso) => d3.min(math.filter((r) => r.iso === iso && r.year <= 2009), (r) => r.year);
const START = countries.filter((iso) => {
  if (iso === "BRA") return false;
  const y0 = firstYear(iso);
  const bra = y0 == null ? undefined : mathAt("BRA", y0);
  return bra != null && Math.abs(mathAt(iso, y0) - bra) <= START_GAP;
});

// Grupo 2: renda per capita PPC no ano da última prova entre 65% e 135% da brasileira.
const gdpAt = (iso, year = Y) => at(gdp, iso, year);
const INCOME_BAND = [0.65, 1.35];
const INCOME = countries.filter((iso) => {
  const g = gdpAt(iso);
  const ratio = g / gdpAt("BRA");
  return iso !== "BRA" && g != null && ratio >= INCOME_BAND[0] && ratio <= INCOME_BAND[1] && mathAt(iso) != null;
});

// Grupo 3: América Latina e Caribe.
const LATAM_ALL = ["ARG", "CHL", "COL", "CRI", "DOM", "GTM", "JAM", "MEX", "PAN", "PER", "PRY", "SLV", "TTO", "URY"];
const LATAM = LATAM_ALL.filter((iso) => mathAt(iso) != null);

function groupBars(isos, valueOf, { oecd = true, label } = {}) {
  const rows = ["BRA", ...isos]
    .map((iso) => {
      const value = valueOf(iso);
      if (value == null) return;
      return { iso, name: label ? label(iso) : nm(iso), value, tone: iso === "BRA" ? "bra" : "peer" };
    })
    .filter((r) => r);
  const ref = oecd ? valueOf("OECD") : undefined;
  if (ref != null) rows.push({ iso: "OECD", name: "Média OCDE", value: ref, tone: "group" });
  return rows;
}
function rankOf(rows) {
  const sorted = rows.filter((r) => r.tone !== "group").sort((a, b) => b.value - a.value);
  return { pos: sorted.findIndex((r) => r.iso === "BRA") + 1, n: sorted.length };
}
const above = (rows) => rows.filter((r) => r.tone === "peer" && r.value > rows.find((x) => x.iso === "BRA").value);
const below = (rows) => rows.filter((r) => r.tone === "peer" && r.value < rows.find((x) => x.iso === "BRA").value);

// O grupo do relatório, para mostrar por que ele não serve aqui.
const clubIsos = d.club90.filter((iso) => !["UMC", "LCN"].includes(iso));
const braFirst = firstYear("BRA");
const clubTop = d3.greatest(clubIsos.filter((iso) => mathAt(iso, braFirst) != null), (iso) => mathAt(iso, braFirst));

// Mesmo ponto de partida
const startChange = groupBars(
  START,
  (iso) => {
    const y0 = firstYear(iso);
    const a = mathAt(iso, y0);
    const b = mathAt(iso);
    return a == null || b == null ? undefined : b - a;
  },
  { oecd: false, label: (iso) => `${nm(iso)} (desde ${firstYear(iso)})` },
);
const startChangeRank = rankOf(startChange);
const startLevel = groupBars(START, (iso) => mathAt(iso), { oecd: false });
const braChange = startChange.find((r) => r.iso === "BRA").value;
const braPeak = d3.greatest(math.filter((r) => r.iso === "BRA"), (r) => r.value);

// Renda
const fitRows = countries
  .map((iso) => ({ iso, name: nm(iso), x: gdpAt(iso), y: mathAt(iso) }))
  .filter((r) => r.x != null && r.y != null);
const fit = (() => {
  const xs = fitRows.map((r) => Math.log(r.x));
  const ys = fitRows.map((r) => r.y);
  const mx = d3.mean(xs);
  const my = d3.mean(ys);
  const b = d3.sum(xs, (x, i) => (x - mx) * (ys[i] - my)) / d3.sum(xs, (x) => (x - mx) ** 2);
  return { a: my - b * mx, b };
})();
const expected = (x) => fit.a + fit.b * Math.log(x);
const resid = new Map(fitRows.map((r) => [r.iso, r.y - expected(r.x)]));
const braResid = resid.get("BRA");
const residRank = [...resid.values()].sort((a, b) => b - a).indexOf(braResid) + 1;
const perDoubling = fit.b * Math.log(2);
const incomeLevel = groupBars(INCOME, (iso) => mathAt(iso));
const incomeRank = rankOf(incomeLevel);

// América Latina
const latamLevel = groupBars(LATAM, (iso) => mathAt(iso));
const latamRank = rankOf(latamLevel);

// Leitura e ciências
function subjectRanks(rows) {
  const v = (iso) => at(rows, iso, Y);
  return {
    start: rankOf(groupBars(START, v, { oecd: false })),
    income: rankOf(groupBars(INCOME, v, { oecd: false })),
    latam: rankOf(groupBars(LATAM, v, { oecd: false })),
    bra: v("BRA"),
    oecd: v("OECD"),
  };
}
const readR = subjectRanks(read);
const sciR = subjectRanks(sci);
const rk = ({ pos, n }) => `${pos}º de ${n}`;

// Gasto acumulado
const cumAt = (iso, year = Y) => at(cum, iso, year);
const braCum = cumAt("BRA");
const braCum0 = cumAt("BRA", 2009);
const braCumGrowth = 100 * (braCum / braCum0 - 1);
const braMath09 = mathAt("BRA", 2009);
const cumRows = countries
  .map((iso) => ({ iso, name: nm(iso), x: cumAt(iso), y: mathAt(iso) }))
  .filter((r) => r.x != null && r.y != null);
const similar = cumRows.filter((r) => r.x / braCum >= 0.75 && r.x / braCum <= 1.25 && r.iso !== "BRA").sort((a, b) => b.y - a.y);
const cheaperBetter = cumRows.filter((r) => r.x < braCum && r.y > mathAt("BRA")).sort((a, b) => a.x - b.x);
const cumOecdMedian = d3.median(cumRows.filter((r) => ["AUT", "BEL", "CAN", "CHL", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ISR", "ITA", "JPN", "KOR", "LVA", "LTU", "LUX", "MEX", "NLD", "NZL", "NOR", "POL", "PRT", "SVK", "SVN", "ESP", "SWE", "CHE", "TUR", "GBR", "USA", "AUS", "COL", "CRI"].includes(r.iso)), (r) => r.x);
const TRAJ = ["BRA", "PER", "MEX", "CHL", "URY", "ARG", "TUR", "POL"].filter((iso) => cum.some((r) => r.iso === iso));
const trajRows = TRAJ.flatMap((iso) =>
  cum
    .filter((r) => r.iso === iso && mathAt(iso, r.year) != null)
    .map((r) => ({ iso, name: nm(iso), year: r.year, x: r.value, y: mathAt(iso, r.year) })),
);

const groupOf = new Map([...LATAM, ...INCOME, ...START].map((iso) => [iso, true]));

function scatterLog(rows, { width, xLabel, labels, line, tipX }) {
  const BRA = braColor();
  const bra = rows.filter((r) => r.iso === "BRA");
  const peers = rows.filter((r) => r.iso !== "BRA" && groupOf.has(r.iso));
  const rest = rows.filter((r) => r.iso !== "BRA" && !groupOf.has(r.iso));
  const named = rows.filter((r) => labels.includes(r.iso) && r.iso !== "BRA");
  return Plot.plot({
    width,
    height: Math.round(Math.max(300, Math.min(440, width * 0.62))),
    marginLeft: 44,
    marginRight: 24,
    x: { type: "log", label: xLabel, grid: true, tickFormat: (v) => `${fmt0(v / 1000)} mil` },
    y: { label: "PISA matemática", grid: true },
    marks: [
      line ? Plot.line(line, { x: "x", y: "y", stroke: "currentColor", strokeOpacity: 0.45, strokeDasharray: "6,4" }) : null,
      Plot.dot(rest, { x: "x", y: "y", r: 4, fill: "#cbd5e1" }),
      Plot.dot(peers, { x: "x", y: "y", r: 5, fill: "#6ba8d4", fillOpacity: 0.85 }),
      Plot.dot(bra, { x: "x", y: "y", r: 8, fill: BRA }),
      Plot.text(named, { x: "x", y: "y", text: "name", dy: -10, fontSize: 10, fill: "currentColor" }),
      Plot.text(bra, { x: "x", y: "y", text: "name", dy: 16, fontWeight: 700, fill: BRA }),
      Plot.tip(rows, Plot.pointer({ x: "x", y: "y", title: (r) => `${r.name}\n${tipX(r.x)}\nPISA ${Y}: ${fmt0(r.y)}` })),
    ],
  });
}

function trajPlot(width) {
  const BRA = braColor();
  const others = TRAJ.filter((iso) => iso !== "BRA").map(nm);
  const lastPts = TRAJ.map((iso) => d3.greatest(trajRows.filter((r) => r.iso === iso), (r) => r.year)).filter((r) => r);
  return Plot.plot({
    width,
    height: Math.round(Math.max(320, Math.min(460, width * 0.65))),
    marginLeft: 44,
    marginRight: 70,
    x: { type: "log", label: "gasto público acumulado por aluno, 6 a 15 anos (US$ PPC constantes)", grid: true, tickFormat: (v) => `${fmt0(v / 1000)} mil` },
    y: { label: "PISA matemática", grid: true },
    color: { domain: ["Brasil", ...others], range: [BRA, ...d3.schemeTableau10] },
    marks: [
      Plot.line(trajRows.filter((r) => r.iso !== "BRA"), { x: "x", y: "y", z: "iso", stroke: "name", strokeWidth: 1.5, strokeOpacity: 0.8, marker: "dot" }),
      Plot.line(trajRows.filter((r) => r.iso === "BRA"), { x: "x", y: "y", stroke: "name", strokeWidth: 3, marker: "dot" }),
      Plot.text(lastPts, { x: "x", y: "y", text: "name", dx: 8, textAnchor: "start", fill: "name", fontWeight: 600 }),
      Plot.text(trajRows.filter((r) => r.iso === "BRA"), { x: "x", y: "y", text: (r) => String(r.year), dy: 14, fontSize: 10, fill: BRA }),
      Plot.tip(trajRows, Plot.pointer({ x: "x", y: "y", title: (r) => `${r.name}, PISA ${r.year}\ngasto acumulado: ${usd(r.x)}\nmatemática: ${fmt0(r.y)}` })),
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
```

```js
html`<div class="lede-grid">
  ${lede("PISA matemática", String(Y), fmt0(mathAt("BRA")))}
  ${lede("Contra o esperado para a renda", "pontos em matemática", fmtSigned(braResid), true)}
  ${lede("Gasto acumulado por aluno", `6 a 15 anos · geração do PISA ${Y}`, usd(braCum))}
  ${lede("Gasto e nota desde 2009", "gasto acumulado · matemática", `+${fmt0(braCumGrowth)}% · ${fmtSigned(mathAt("BRA") - braMath09)}`, true)}
</div>`
```

## Com quem comparar

O PISA testa alunos de 15 anos em matemática, leitura e ciências a cada três anos. É a melhor comparação internacional do que a escola ensina, mas não mede a universidade nem o que um adulto aprende depois.

O grupo de pares do relatório foi escolhido pela renda em 1990. Para crescimento, é o grupo certo. Para educação, não: na primeira prova de matemática do Brasil, em ${braFirst}, o Brasil fez ${fmt0(mathAt("BRA", braFirst))} pontos e ${nm(clubTop)} fez ${fmt0(mathAt(clubTop, braFirst))}. Comparar com esses países mede uma distância que já existia, e não diz se o Brasil anda bem ou mal.

Esta página usa três grupos, cada um respondendo a uma pergunta:

- **Mesmo ponto de partida** — quem saiu de onde o Brasil estava avançou mais? São os países cuja nota de matemática na primeira prova (até 2009) ficou a até ${START_GAP} pontos da brasileira no mesmo ano: ${listPt(START.map(nm))}.
- **Mesma renda hoje** — o Brasil aprende o que seria esperado para a renda que tem? São os países com renda per capita entre 65% e 135% da brasileira em ${Y}, em dólar PPC: ${listPt(INCOME.map(nm))}.
- **América Latina** — os vizinhos, com instituições e histórias parecidas: ${listPt(LATAM.map(nm))}.

## Quem saiu do mesmo lugar

Desde a primeira prova, o Brasil ${braChange >= 0 ? "ganhou" : "perdeu"} ${fmt0(Math.abs(braChange))} pontos em matemática. É o ${rk(startChangeRank)} no grupo que partiu do mesmo nível. ${above(startChange).length ? `Avançaram mais: ${listPt(above(startChange).map((r) => nm(r.iso)))}.` : ""}

${resize((width) => barDelta(startChange, {width, xLabel: `variação em matemática, da primeira prova até ${Y} (pontos)`, format: fmtSigned, marginLeft: 190}))}

O avanço brasileiro se concentrou no começo. A nota subiu até ${fmt0(braPeak.value)} em ${braPeak.year} e depois oscilou para baixo. Em ${Y}, o Brasil fica em ${rk(rankOf(startLevel))} no grupo em nota absoluta.

${resize((width) => metricPlot(keep(math, ["BRA", ...START, "OECD"]), {width, yLabel: "PISA matemática", markRefs: true, rules: [2012], format: fmt0}))}

## O esperado para a renda

Países mais ricos tendem a ter notas maiores. Entre os ${fitRows.length} países com PISA e renda em ${Y}, cada vez que a renda per capita dobra, a nota de matemática sobe em média ${fmt0(perDoubling)} pontos. A linha tracejada abaixo mostra essa relação.

O Brasil fica ${fmt0(Math.abs(braResid))} pontos ${braResid < 0 ? "abaixo" : "acima"} do esperado para a sua renda: ${residRank}º de ${fitRows.length}. O caso oposto é o Vietnã, ${fmt0(resid.get("VNM"))} pontos acima do esperado, com renda menor que a brasileira.

${resize((width) => scatterLog(fitRows, {width, xLabel: `renda per capita ${Y} (US$ PPC, escala log)`, labels: ["VNM", "PER", "MEX", "CHL", "ARG", "TUR", "POL", "KOR", "UKR", "MDA", "DOM", "SGP", "QAT", "PAN"], line: d3.ticks(d3.min(fitRows, (r) => r.x), d3.max(fitRows, (r) => r.x), 60).map((x) => ({ x, y: expected(x) })), tipX: (x) => `renda: ${usd(x)}`}))}

Os pontos azuis são os países de algum dos três grupos; os cinza, os demais participantes do PISA.

Entre os países de renda parecida, o Brasil é o ${rk(incomeRank)}. ${listPt(below(incomeLevel).map((r) => r.name))} ficam abaixo.

${resize((width) => barDelta(incomeLevel, {width, xLabel: `PISA matemática ${Y}, países com renda entre 65% e 135% da brasileira`, format: fmt0}))}

## América Latina

Na região, o Brasil é o ${rk(latamRank)} em matemática. ${listPt(above(latamLevel).map((r) => r.name))} ficam acima; ${listPt(below(latamLevel).map((r) => r.name))}, abaixo. Toda a região está longe da média da OCDE.

${resize((width) => barDelta(latamLevel, {width, xLabel: `PISA matemática ${Y}`, format: fmt0}))}

## Leitura e ciências

Em leitura o Brasil vai melhor que em matemática; em ciências, pior. Em leitura, o Brasil fez ${fmt0(readR.bra)} pontos em ${Y}, contra ${fmt0(readR.oecd)} na OCDE: ${rk(readR.start)} no grupo de mesmo ponto de partida, ${rk(readR.income)} entre os de renda parecida e ${rk(readR.latam)} na América Latina. Em ciências, ${fmt0(sciR.bra)} pontos, contra ${fmt0(sciR.oecd)}: ${rk(sciR.start)}, ${rk(sciR.income)} e ${rk(sciR.latam)}.

${resize((width) => metricPlot(keep(read, ["BRA", ...LATAM, "OECD"]), {width, yLabel: "PISA leitura, América Latina", markRefs: true, format: fmt0}))}

## O Brasil gasta pouco ou gasta mal?

Como fatia do PIB, o gasto público brasileiro em educação é alto: ${d.fmtPct(d.eduBra?.value)} em ${d.eduBra?.year}. Mas fatia do PIB não diz quanto dinheiro chega a cada aluno. Um país mais pobre, ou com mais crianças, pode gastar uma fatia grande e ainda pôr pouco dinheiro por aluno.

A medida usada aqui é o **gasto público acumulado por aluno dos 6 aos 15 anos**, em dólar PPC constante — o dinheiro que o governo gastou com um aluno até a idade em que ele faz o PISA. A conta segue cada geração: para o aluno que fez a prova em ${Y}, soma o gasto por aluno de cada ano entre ${Y - 9} e ${Y}, no nível de ensino que ele cursava em cada idade.

Para a geração do PISA ${Y}, o Brasil gastou ${usd(braCum)} por aluno. A mediana dos países da OCDE com dado é ${usd(cumOecdMedian)}. Em valor absoluto, o Brasil gasta bem menos que os países ricos.

<div class="takeaway">
  <strong>O gasto por aluno subiu ${fmt0(braCumGrowth)}% e a nota não acompanhou.</strong>
  <span>A geração do PISA 2009 recebeu ${usd(braCum0)}; a de ${Y}, ${usd(braCum)}. No mesmo período, a nota de matemática foi de ${fmt0(braMath09)} para ${fmt0(mathAt("BRA"))}.</span>
</div>

O gráfico abaixo mostra o caminho de alguns países de uma prova para outra: cada ponto é uma edição do PISA. O Brasil anda para a direita (mais gasto) sem subir (mais nota). O Peru, com cerca de metade do gasto brasileiro, saiu de baixo do Brasil e passou à frente.

${resize((width) => trajPlot(width))}

Com dinheiro parecido com o brasileiro (entre 75% e 125% do gasto acumulado do Brasil), a nota varia muito: ${listPt(similar.map((r) => `${r.name} (${fmt0(r.y)})`))}. ${cheaperBetter.length ? `Gastam menos e tiram mais: ${listPt(cheaperBetter.map((r) => r.name))}.` : ""}

${resize((width) => scatterLog(cumRows, {width, xLabel: `gasto público acumulado por aluno, 6 a 15 anos, geração do PISA ${Y} (US$ PPC, escala log)`, labels: ["PER", "MEX", "CHL", "URY", "ARG", "TUR", "POL", "KOR", "MDA", "DOM", "UKR", "EST", "PRT", "GTM", "JOR"], tipX: (x) => `gasto acumulado: ${usd(x)}`}))}

<div class="takeaway">
  <strong>Pouco e mal.</strong>
  <span>Em dinheiro por aluno, o Brasil gasta muito menos que os países ricos, então "gasta muito" está errado. Mas países com gasto parecido ou menor, como ${listPt(cheaperBetter.slice(0, 3).map((r) => r.name))}, tiram notas maiores. E o aumento do gasto na última década não virou aprendizado.</span>
</div>

## O que isso não diz

- **Cobertura do PISA.** O PISA só testa jovens de 15 anos matriculados a partir do 7º ano. No Brasil, uma parte grande dos jovens dessa idade fica fora, por atraso ou abandono. Isso tende a *melhorar* a média brasileira em relação a países que testam quase todos os jovens.
- **Só gasto público.** O gasto acumulado não inclui mensalidades nem aulas particulares. Isso subestima o dinheiro total em países como Coreia e Chile, onde as famílias gastam muito.
- **Denominador.** A UNESCO divide o gasto público por todos os alunos, inclusive os de escola privada, que no ensino básico brasileiro são cerca de um em cada cinco.
- **Preços.** O dólar PPC corrige o custo de vida médio, não o salário dos professores, que costuma pesar mais nos países pobres.
- **Lacunas.** Os anos sem dado de gasto são preenchidos por interpolação. Cada geração precisa de pelo menos 5 dos 10 anos com dado observado. Vários países de renda média não têm a série e ficam fora dos gráficos de gasto.
- **Causa.** Os gráficos mostram associações, não o efeito do gasto. A estrutura de cada sistema (carreira docente, currículo, gestão) não aparece aqui.

Fontes: OCDE PISA, tabelas I.B1.5.4–6, via [Our World in Data](https://ourworldindata.org/grapher/average-performance-of-15-year-olds-in-mathematics-reading-and-science) · UNESCO UIS, financiamento público inicial por aluno em PPC constante (`XUNIT.PPPCONST.{02,1,2,3}.FSGOV.FFNTR`) · Banco Mundial WDI (`NY.GDP.PCAP.PP.KD`, `SE.PRM.AGES`, `SE.SEC.AGES`, `SE.SEC.DURS.LO`, `SE.XPD.TOTL.GD.ZS`).
