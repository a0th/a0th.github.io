---
toc:
  label: Nesta página
---

# Segurança pública

Esta página acompanha o [relatório](./). Ela compara a violência letal no Brasil com o mesmo grupo de pares — países cuja renda per capita em 1990 ficava entre 65% e 135% da brasileira — e com a América Latina.

```js
import { load, series, at, last, keep, NAMES } from "./components/data.js";
import { metricPlot, barDelta } from "./components/plots.js";

const wdi = await FileAttachment("./data/wdi.csv").csv({ typed: true });
const pisa = await FileAttachment("./data/pisa.csv").csv({ typed: true });
const d = load(wdi, pisa);

const hom = series("homicides", wdi);
const homMale = series("homicides_male", wdi);
const homFemale = series("homicides_female", wdi);
const stability = series("pol_stability", wdi);
const law = series("rule_of_law", wdi);

const LATAM = ["ARG", "BOL", "BRA", "CHL", "COL", "CRI", "CUB", "DOM", "ECU", "SLV", "GTM", "HTI", "HND", "MEX", "NIC", "PAN", "PRY", "PER", "URY", "VEN"];
const club = d.club90.filter((iso) => !["UMC", "LCN"].includes(iso));
const MIN_YEAR = 2019;

const fmtRate = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));
const fmtTimes = (x) => (x == null ? "—" : `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} vezes`);
const mean = (xs) => {
  const v = xs.filter(Number.isFinite);
  return v.length ? d3.mean(v) : undefined;
};

function recent(rows, iso) {
  const row = last(rows, iso);
  return row && row.year >= MIN_YEAR ? row : undefined;
}

function bars(rows, isos, { group } = {}) {
  const out = isos
    .map((iso) => {
      const row = recent(rows, iso);
      if (!row) return;
      return { iso, name: NAMES[iso] ?? iso, value: row.value, year: row.year, tone: iso === "BRA" ? "bra" : "peer" };
    })
    .filter((row) => row);
  if (group) {
    const row = recent(rows, group.iso);
    if (row) out.push({ iso: group.iso, name: group.name, value: row.value, year: row.year, tone: "group" });
  }
  return out;
}

function rankOf(rows, iso) {
  const sorted = rows.filter((r) => r.tone !== "group").sort((a, b) => b.value - a.value);
  return { pos: sorted.findIndex((r) => r.iso === iso) + 1, n: sorted.length };
}

const nth = ({ pos }) => (pos === 1 ? "a maior" : `a ${pos}ª maior`);
const othersMean = (rows) => mean(rows.filter((r) => r.iso !== "BRA" && r.tone !== "group").map((r) => r.value));
const above = (rows) => rows.filter((r) => r.tone === "peer" && r.value > rows.find((x) => x.iso === "BRA")?.value).map((r) => r.name);
const listPt = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`);

const braNow = last(hom, "BRA");
const braPeak = d3.greatest(hom.filter((r) => r.iso === "BRA"), (r) => r.value);
const bra90 = at(hom, "BRA", 1990);
const dropSincePeak = (100 * (braPeak.value - braNow.value)) / braPeak.value;

const clubBars = bars(hom, club);
const clubRank = rankOf(clubBars, "BRA");
const clubMean = othersMean(clubBars);
const clubAbove = above(clubBars);
const clubMedian = d3.median(clubBars.filter((r) => r.iso !== "BRA"), (r) => r.value);

const clubBelowOne = clubBars.filter((r) => r.value < 1).sort((a, b) => a.value - b.value).map((r) => r.name);

const latamBars = bars(hom, LATAM, { group: { iso: "LCN", name: "América Latina e Caribe" } });
const latamRank = rankOf(latamBars, "BRA");
const latamAbove = above(latamBars);
const latamBelow = latamBars
  .filter((r) => r.tone === "peer" && r.value < braNow.value)
  .sort((a, b) => a.value - b.value)
  .map((r) => r.name);

function sexPlot(width) {
  const bra = getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
  const rows = [
    ...homMale.filter((r) => r.iso === "BRA").map((r) => ({ year: r.year, value: r.value, sex: "Homens" })),
    ...homFemale.filter((r) => r.iso === "BRA").map((r) => ({ year: r.year, value: r.value, sex: "Mulheres" })),
  ];
  return Plot.plot({
    width,
    height: Math.round(Math.max(260, Math.min(380, width * 0.7))),
    marginLeft: 48,
    x: { label: null, tickFormat: "d" },
    y: { label: "homicídios por 100 mil, Brasil", grid: true },
    color: { legend: true, domain: ["Homens", "Mulheres"], range: [bra, "#b45309"] },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(rows, { x: "year", y: "value", stroke: "sex", strokeWidth: 2, tip: true }),
    ],
  });
}
const lcnNow = recent(hom, "LCN")?.value;
const umcNow = recent(hom, "UMC")?.value;

const braMale = last(homMale, "BRA");
const braFemale = last(homFemale, "BRA");
const femaleBars = bars(homFemale, club);
const femaleRank = rankOf(femaleBars, "BRA");

const stabBra = last(stability, "BRA");
const stab00 = at(stability, "BRA", 2000);
const stabPol = last(stability, "POL");
const stabKor = last(stability, "KOR");
const lawBra = last(law, "BRA");
const lawPol = last(law, "POL");
const lawKor = last(law, "KOR");
const lawBra96 = at(law, "BRA", 1996);

const oc = await FileAttachment("./data/ocindex.csv").csv({ typed: true });
const ocCrime = series("criminality", oc);
const ocRes = series("resilience", oc);
const ocYear = d3.max(ocCrime, (r) => r.year);
const fmtScore = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }));

function ocBars(rows) {
  const out = club
    .map((iso) => {
      const value = at(rows, iso, ocYear);
      if (value == null) return;
      return { iso, name: NAMES[iso] ?? iso, value, tone: iso === "BRA" ? "bra" : "peer" };
    })
    .filter((row) => row);
  out.push({ iso: "WORLD", name: "Média mundial", value: at(rows, "WORLD", ocYear), tone: "group" });
  return out;
}

const ocCrimeBars = ocBars(ocCrime);
const ocCrimeRank = rankOf(ocCrimeBars, "BRA");
const ocCrimeAbove = above(ocCrimeBars);
const ocResBars = ocBars(ocRes);
const ocResRank = rankOf(ocResBars, "BRA");
const ocBra = (metric, year = ocYear) => at(series(metric, oc), "BRA", year);
const ocWorld = (metric, year = ocYear) => at(series(metric, oc), "WORLD", year);
const ocYears = [...new Set(ocCrime.map((r) => r.year))].sort();
const ocPeerPos = (metric) => {
  const rows = series(metric, oc).filter((r) => r.year === ocYear && club.includes(r.iso));
  const braValue = rows.find((r) => r.iso === "BRA")?.value;
  return { pos: 1 + rows.filter((r) => r.value > braValue).length, n: rows.length };
};
const ocBelow = (metric) =>
  club.filter((iso) => at(series(metric, oc), iso, ocYear) < ocBra(metric)).map((iso) => NAMES[iso] ?? iso);

const OC_CRIME = [
  ["mafia_style_groups", "Grupos de tipo máfia"],
  ["state_embedded_actors", "Agentes dentro do Estado"],
  ["criminal_networks", "Redes criminosas"],
  ["cocaine_trade", "Tráfico de cocaína"],
  ["arms_trafficking", "Tráfico de armas"],
  ["extortion_and_protection_racketeering", "Extorsão e cobrança de proteção"],
];
const OC_RES = [
  ["territorial_integrity", "Controle do território"],
  ["law_enforcement", "Polícia"],
  ["judicial_system_and_detention", "Justiça e prisões"],
  ["anti_money_laundering", "Combate à lavagem de dinheiro"],
];

function ocDots(indicators, width, label) {
  const bra = getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
  const rows = indicators.flatMap(([metric, name]) =>
    club
      .map((iso) => ({ name, iso, country: NAMES[iso] ?? iso, value: at(series(metric, oc), iso, ocYear) }))
      .filter((r) => r.value != null),
  );
  const world = indicators.map(([metric, name]) => ({ name, value: ocWorld(metric) }));
  return Plot.plot({
    width,
    height: 40 + 34 * indicators.length,
    marginLeft: Math.min(230, Math.max(150, width * 0.32)),
    x: { domain: [1, 10], label, grid: true },
    y: { label: null, domain: indicators.map(([, name]) => name) },
    marks: [
      Plot.tickX(world, { x: "value", y: "name", stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "3,2" }),
      Plot.dot(rows.filter((r) => r.iso !== "BRA"), { x: "value", y: "name", r: 4, fill: "#cbd5e1", stroke: "#94a3b8", tip: true, title: (r) => `${r.country}: ${fmtScore(r.value)}` }),
      Plot.dot(rows.filter((r) => r.iso === "BRA"), { x: "value", y: "name", r: 7, fill: bra, tip: true, title: (r) => `Brasil: ${fmtScore(r.value)}` }),
    ],
  });
}

function ocTrend(width) {
  const bra = getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
  const rows = [
    ...ocCrime.filter((r) => r.iso === "BRA").map((r) => ({ year: r.year, value: r.value, line: "Criminalidade, Brasil" })),
    ...ocCrime.filter((r) => r.iso === "WORLD").map((r) => ({ year: r.year, value: r.value, line: "Criminalidade, média mundial" })),
    ...ocRes.filter((r) => r.iso === "BRA").map((r) => ({ year: r.year, value: r.value, line: "Resiliência, Brasil" })),
    ...ocRes.filter((r) => r.iso === "WORLD").map((r) => ({ year: r.year, value: r.value, line: "Resiliência, média mundial" })),
  ];
  const domain = ["Criminalidade, Brasil", "Criminalidade, média mundial", "Resiliência, Brasil", "Resiliência, média mundial"];
  return Plot.plot({
    width,
    height: Math.round(Math.max(260, Math.min(360, width * 0.6))),
    marginLeft: 40,
    x: { label: null, ticks: ocYears, tickFormat: "d" },
    y: { label: "nota (1 a 10)", domain: [4, 8], grid: true },
    color: { legend: true, domain, range: [bra, "#94a3b8", "#b45309", "#d6b38a"] },
    marks: [
      Plot.lineY(rows.filter((r) => !r.line.includes("mundial")), { x: "year", y: "value", stroke: "line", strokeWidth: 2 }),
      Plot.lineY(rows.filter((r) => r.line.includes("mundial")), { x: "year", y: "value", stroke: "line", strokeWidth: 2, strokeDasharray: "4,3" }),
      Plot.dot(rows, { x: "year", y: "value", fill: "line", r: 4, tip: true, title: (r) => `${r.line}, ${r.year}: ${fmtScore(r.value)}` }),
    ],
  });
}

const fmtIdx2 = (x) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 1, signDisplay: "exceptZero" }));

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
  ${lede("Homicídios por 100 mil", String(braNow.year), fmtRate(braNow.value), true)}
  ${lede("Contra o par típico", "taxa brasileira dividida pela mediana dos pares", fmtTimes(braNow.value / clubMedian), true)}
  ${lede("Desde o pico", `${braPeak.year} → ${braNow.year}`, `−${d.fmtPct(dropSincePeak)}`)}
</div>`
```

## Como a violência é medida aqui

A medida é a taxa de homicídios intencionais por 100 mil habitantes, compilada pelo Escritório das Nações Unidas sobre Drogas e Crime (UNODC) e publicada pelo Banco Mundial. É a única série que permite comparar dezenas de países com a mesma definição.

Ela não bate exatamente com os números que circulam no Brasil. O Fórum Brasileiro de Segurança Pública soma às agressões as mortes por intervenção policial e os latrocínios, e o Atlas da Violência estima homicídios escondidos entre as mortes de causa indeterminada. As duas fontes dão taxas mais altas que a do UNODC. A tendência, porém, é a mesma.

## O Brasil contra os pares

Em ${braNow.year}, o Brasil teve ${fmtRate(braNow.value)} homicídios por 100 mil habitantes. A mediana dos ${clubBars.length - 1} outros pares com dado recente foi ${fmtRate(clubMedian)}. A média simples, ${fmtRate(clubMean)}, é puxada para cima por poucos países muito violentos. O Brasil tem ${nth(clubRank)} taxa do grupo. Só ${listPt(clubAbove)} ficam acima.

${resize((width) => barDelta(clubBars, {width, xLabel: `homicídios por 100 mil (último ano desde ${MIN_YEAR})`, format: fmtRate}))}

A média esconde dois mundos. ${listPt(clubBelowOne)} têm taxas abaixo de 1 por 100 mil. A taxa brasileira é cerca de ${d.fmtIdx(braNow.value / recent(hom, "POL")?.value)} vezes a polonesa e ${d.fmtIdx(braNow.value / recent(hom, "KOR")?.value)} vezes a coreana. Os países que abriram distância do Brasil em renda também abriram em segurança.

${resize((width) => metricPlot(keep(hom, club), {width, yLabel: "homicídios por 100 mil", format: fmtRate}))}

## E dentro da América Latina?

A América Latina é a região mais violenta do mundo, e o Brasil está na metade mais violenta dela. A taxa média da região, pelo agregado do Banco Mundial, foi ${fmtRate(lcnNow)} por 100 mil, quase igual à brasileira. Entre os países de renda média-alta no mundo, a média é ${fmtRate(umcNow)}.

O Brasil tem ${nth(latamRank)} taxa entre ${latamRank.n} países latino-americanos com dado recente. Acima dele estão ${listPt(latamAbove)}. Abaixo, entre outros, ${listPt(latamBelow.slice(0, 5))}.

${resize((width) => barDelta(latamBars, {width, xLabel: `homicídios por 100 mil (último ano desde ${MIN_YEAR})`, format: fmtRate}))}

Como o Brasil tem um terço da população da região, o agregado latino-americano do Banco Mundial pesa muito o próprio Brasil. A comparação com os países, um a um, é mais informativa que a comparação com a média.

## Quase trinta anos de alta, seis de queda

A trajetória brasileira tem duas fases claras. De ${fmtRate(bra90)} por 100 mil em 1990, a taxa subiu quase sem parar até ${fmtRate(braPeak.value)} em ${braPeak.year}. Desde então caiu ${d.fmtPct(dropSincePeak)}, para ${fmtRate(braNow.value)} em ${braNow.year} — de volta ao nível de 1990.

${resize((width) => metricPlot(keep(hom, ["BRA", "LCN", "MEX", "COL", "CHL", "ARG"]), {width, yLabel: "homicídios por 100 mil", markRefs: true, rules: [braPeak.year], format: fmtRate}))}

<div class="takeaway">
  <strong>Aqui a tese da inércia não vale, nos dois sentidos.</strong>
  <span>Entre 1990 e ${braPeak.year}, enquanto a pobreza caía e a renda subia, a violência letal brasileira subiu. Depois de ${braPeak.year}, caiu rápido, num período de renda quase parada. Nenhuma das duas fases acompanhou o resto da economia.</span>
</div>

A queda depois de 2017 é real e grande, e não tem uma explicação única aceita. Os estudos brasileiros apontam várias causas ao mesmo tempo: menos jovens na população, porque a fecundidade caiu; mudanças na disputa entre facções criminosas; políticas estaduais de segurança; e mudanças na forma de registrar as mortes. Estes dados não permitem separar o peso de cada uma.

## Quem morre

A violência letal no Brasil é masculina. Em ${braMale.year}, a taxa entre homens foi ${fmtRate(braMale.value)} por 100 mil, contra ${fmtRate(braFemale.value)} entre mulheres — ${d.fmtIdx(braMale.value / braFemale.value)} vezes mais.

${resize((width) => sexPlot(width))}

Quase toda a alta e quase toda a queda vieram dos homens. A taxa entre mulheres mudou pouco em três décadas. Mesmo assim, comparada à de outros países, ela é alta: o Brasil tem ${nth(femaleRank)} taxa de homicídios de mulheres entre ${femaleRank.n} pares com dado.

${resize((width) => barDelta(femaleBars, {width, xLabel: `homicídios de mulheres por 100 mil mulheres (último ano desde ${MIN_YEAR})`, format: fmtRate}))}

Esta série não mostra idade, cor nem local. Os dados brasileiros, como os do Atlas da Violência, mostram que as vítimas se concentram entre homens jovens, negros e moradores das periferias e de alguns estados do Norte e do Nordeste. Essa é a parte mais importante do problema, e ela não aparece numa comparação entre países.

## Crime organizado e domínio territorial

A taxa de homicídios mede mortes, não o poder das organizações criminosas. Uma facção que domina um território sem rival pode matar menos do que duas facções em guerra. Para medir o crime organizado em si, a única comparação entre países é o Índice Global de Crime Organizado, da Global Initiative Against Transnational Organized Crime, uma organização com sede em Genebra.

O índice dá notas de 1 a 10 para 193 países, a partir de avaliações de especialistas apoiadas em dados públicos. Ele mede dois lados. A **criminalidade** é a média da força dos mercados criminosos (drogas, armas, extorsão, crimes ambientais e outros) e dos atores criminosos (facções, milícias, redes e agentes do próprio Estado). A **resiliência** mede a capacidade do país de resistir: polícia, Justiça, combate à lavagem de dinheiro, controle do território. Houve edições em ${listPt(ocYears.map(String))}.

```js
html`<div class="lede-grid">
  ${lede("Criminalidade, Brasil", `nota de 1 a 10, ${ocYear}`, fmtScore(ocBra("criminality")), true)}
  ${lede("Posição no mundo", `entre 193 países, ${ocYear}`, `${ocBra("criminality_rank")}º`, true)}
  ${lede("Resiliência, Brasil", `nota de 1 a 10, ${ocYear}`, fmtScore(ocBra("resilience")))}
</div>`
```

Em ${ocYear}, o Brasil teve nota ${fmtScore(ocBra("criminality"))} em criminalidade, ${ocBra("criminality_rank")}º lugar entre 193 países. ${ocBra("criminality_rank", 2021) === ocBra("criminality_rank", 2023) ? `Nas edições de 2021 e 2023 estava em ${ocBra("criminality_rank", 2023)}º.` : `Nas edições de 2021 e 2023 estava em ${ocBra("criminality_rank", 2021)}º e ${ocBra("criminality_rank", 2023)}º.`} A média mundial é ${fmtScore(ocWorld("criminality"))}. Entre os pares, o Brasil tem ${nth(ocCrimeRank)} nota. Acima dele ficam ${listPt(ocCrimeAbove)}.

${resize((width) => barDelta(ocCrimeBars, {width, xLabel: `criminalidade, nota de 1 a 10 (${ocYear})`, format: fmtScore}))}

O Brasil vai pior nos mercados criminosos que nos atores. Na nota de mercados, o Brasil é o ${ocBra("criminal_markets_rank")}º do mundo; na de atores, o ${ocBra("criminal_actors_rank")}º. O gráfico abaixo mostra os indicadores mais ligados ao domínio territorial. Cada ponto cinza é um par, o ponto azul é o Brasil e o traço tracejado é a média mundial.

${resize((width) => ocDots(OC_CRIME, width, `nota de 1 a 10 (${ocYear}) · mais alto = mais crime`))}

Em todos eles, no máximo ${d3.max(OC_CRIME, ([metric]) => ocPeerPos(metric).pos) - 1} pares têm nota maior que a brasileira. Em grupos de tipo máfia — organizações com nome, hierarquia e controle de território, como as grandes facções —, o Brasil tem nota ${fmtScore(ocBra("mafia_style_groups"))}, contra ${fmtScore(ocWorld("mafia_style_groups"))} na média mundial. Em agentes criminosos dentro do Estado, como policiais e políticos ligados ao crime, tem ${fmtScore(ocBra("state_embedded_actors"))}, ${nth(ocPeerPos("state_embedded_actors"))} nota do grupo. No tráfico de cocaína, ${fmtScore(ocBra("cocaine_trade"))}, ${nth(ocPeerPos("cocaine_trade"))} nota do grupo.

${resize((width) => ocTrend(width))}

<div class="takeaway">
  <strong>Menos mortes não quer dizer menos crime organizado.</strong>
  <span>A taxa de homicídios brasileira caiu depois de 2017. No mesmo período, a nota de criminalidade do índice subiu a cada edição, de ${fmtScore(ocBra("criminality", 2021))} em 2021 para ${fmtScore(ocBra("criminality"))} em ${ocYear}. A resiliência não saiu do lugar: ${listPt(ocYears.map((y) => fmtScore(ocBra("resilience", y))))}, nas três edições.</span>
</div>

Duas ressalvas. A edição de 2023 passou a incluir cinco mercados novos, como extorsão e crimes financeiros, então parte da alta entre 2021 e 2023 vem da mudança no método. A comparação entre 2023 e ${ocYear} usa a mesma lista: a nota brasileira subiu ${fmtScore(ocBra("criminality") - ocBra("criminality", 2023))} ponto. E as notas são avaliações de especialistas, não contagens. Diferenças de alguns décimos ficam dentro do que o julgamento de cada avaliador pode mudar.

Na resiliência, a nota brasileira, ${fmtScore(ocBra("resilience"))}, fica um pouco acima da média mundial (${fmtScore(ocWorld("resilience"))}), mas abaixo da maioria dos pares: é ${nth(ocResRank)} entre ${ocResRank.n}. Só ${listPt(ocBelow("resilience"))} ficam atrás.

${resize((width) => barDelta(ocResBars, {width, xLabel: `resiliência, nota de 1 a 10 (${ocYear}) · mais alto = melhor`, format: fmtScore}))}

O ponto mais fraco é a parte que enfrenta o crime no dia a dia:

${resize((width) => ocDots(OC_RES, width, `nota de 1 a 10 (${ocYear}) · mais alto = mais resiliência`))}

Na polícia, o Brasil tem nota ${fmtScore(ocBra("law_enforcement"))}; só ${listPt(ocBelow("law_enforcement"))} fica abaixo entre os pares. Em Justiça e prisões, ${fmtScore(ocBra("judicial_system_and_detention"))}; só ${listPt(ocBelow("judicial_system_and_detention"))} ficam abaixo.

### Quanta gente vive sob facções e milícias

O índice não diz quantas pessoas vivem em áreas dominadas. Para isso existem duas fontes brasileiras, sem equivalente em outros países.

A primeira é uma pesquisa Datafolha para o Fórum Brasileiro de Segurança Pública, de março de 2026, com 2.004 entrevistas. Nela, 41,2% dos brasileiros com 16 anos ou mais dizem que há facções ou milícias no bairro onde moram — cerca de 68,7 milhões de pessoas. Nas capitais são 55,9%; no interior, 34,1%. Entre esses moradores, 61,4% dizem que os grupos influenciam muito ou moderadamente as regras do bairro, e 51,1% sofreram algum tipo de violência em 12 meses, contra 40,1% na média nacional.

Uma pesquisa anterior, de junho de 2025, dava 19%. Mas ela perguntava sobre presença explícita dos grupos. A diferença vem em boa parte da pergunta, e as duas não formam uma série.

A segunda é o Mapa Histórico dos Grupos Armados, da Universidade Federal Fluminense e do Instituto Fogo Cruzado. Ele cobre só a região metropolitana do Rio de Janeiro, de 2007 a 2024, a partir de denúncias anônimas conferidas com notícias. Em 2024, 29,7% da população da região vivia sob controle direto de grupos armados, e outros 5,3% sob a influência deles. São quase 4 milhões de pessoas, o maior número da série. As milícias têm a maior área controlada, 49,4% do total, e foram o grupo que mais cresceu: a área delas aumentou 315% desde 2007. O Comando Vermelho tem a maior parte da área sob controle direto.

Os números do Rio não valem para o país. Mostram, porém, o que a queda de homicídios pode esconder: um território controlado sem disputa é, muitas vezes, um território com menos mortes.

## Instituições: a percepção piorou

Dois indicadores de governança do Banco Mundial ajudam a pôr a violência em contexto. Ambos são medidas de percepção, construídas a partir de pesquisas e avaliações de especialistas, com margem de erro grande. Zero é a média mundial.

O de estabilidade política e ausência de violência caiu de ${fmtIdx2(stab00)} em 2000 para ${fmtIdx2(stabBra?.value)} em ${stabBra?.year}. A Polônia está em ${fmtIdx2(stabPol?.value)} e a Coreia em ${fmtIdx2(stabKor?.value)}.

${resize((width) => metricPlot(keep(stability, club), {width, yLabel: "estabilidade política e ausência de violência", yRules: [0], format: fmtIdx2}))}

O de Estado de direito — confiança na polícia, nos tribunais e no cumprimento de contratos — passou de ${fmtIdx2(lawBra96)} em 1996 para ${fmtIdx2(lawBra?.value)} em ${lawBra?.year}. Polônia: ${fmtIdx2(lawPol?.value)}. Coreia: ${fmtIdx2(lawKor?.value)}.

${resize((width) => metricPlot(keep(law, club), {width, yLabel: "Estado de direito", yRules: [0], format: fmtIdx2}))}

A queda de homicídios depois de 2017 quase não aparece nesses índices. O de estabilidade melhorou um pouco desde o pior ponto (${fmtIdx2(at(stability, "BRA", 2019))} em 2019), e o de Estado de direito continua abaixo do nível de 1996.

## Limites desta página

- A série do UNODC é a única comparável entre países, mas subestima a violência letal brasileira em relação às fontes nacionais, que incluem mortes por intervenção policial e homicídios escondidos.
- Os países não publicam dados nos mesmos anos. A comparação usa o último dado de cada país desde ${MIN_YEAR}; quem não tem dado nesse período fica de fora.
- Estabilidade política e Estado de direito são medidas de percepção. Não medem crime.
- O Índice Global de Crime Organizado é feito de avaliações de especialistas, não de contagens. A edição de 2021 tem menos indicadores que as seguintes.
- As pesquisas sobre presença de facções medem o que os moradores dizem ver, e mudam muito conforme a pergunta. O mapa de grupos armados cobre só a região metropolitana do Rio.
- Nada aqui identifica causas. A coincidência entre a queda de homicídios e a queda da fecundidade, ou qualquer mudança política, não prova uma relação.

Fontes: UNODC, via World Bank WDI (`VC.IHR.PSRC.P5`, `VC.IHR.PSRC.MA.P5`, `VC.IHR.PSRC.FE.P5`) · World Bank Worldwide Governance Indicators (`GOV_WGI_PV.EST`, `GOV_WGI_RL.EST`) · [Global Organized Crime Index](https://ocindex.net/), GI-TOC ([base de dados](https://ocindex.net/assets/downloads/global_oc_index.xlsx), [perfil do Brasil](https://ocindex.net/country/brazil/)) · Datafolha/FBSP, [*Os gatilhos da insegurança* (resumo executivo, 2026)](https://forumseguranca.org.br/wp-content/uploads/2026/05/os-gatilhos-da-inseguranca-resumo-executivo-2026.pdf) e [pesquisa de 2025, via G1](https://g1.globo.com/politica/noticia/2025/10/16/pessoas-vivem-em-area-dominada-por-faccoes-e-milicias-diz-datafolha.ghtml) · GENI/UFF e Instituto Fogo Cruzado, [Mapa Histórico dos Grupos Armados (relatório 2025)](https://geni.uff.br/wp-content/uploads/sites/357/2025/12/Relatorio-Mapa-2025-Alt3.pdf). O grupo de pares é o mesmo do [relatório](./).
