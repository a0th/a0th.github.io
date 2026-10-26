---
toc:
  label: Nesta página
---

# Eleições: onde o PT tem voto

Esta página acompanha o [relatório](./). Ela cruza o voto no PT no segundo turno das eleições presidenciais, de 2002 a 2022, com indicadores sociais dos 5.570 municípios: renda, escolaridade, peso do Auxílio Brasil e distância até os grandes centros.

```js
const mun = (await FileAttachment("./data/eleicoes.csv").csv({ typed: true })).filter((r) => r.pt2022 != null && r.pop);

const YEARS = [2002, 2006, 2010, 2014, 2018, 2022];
const CANDIDATE = { 2002: "Lula", 2006: "Lula", 2010: "Dilma", 2014: "Dilma", 2018: "Haddad", 2022: "Lula" };
const REGIONS = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const REGION_COLORS = ["#0f766e", "#b45309", "#a16207", "#1e3a8a", "#7c3aed"];

const VARS = [
  { key: "income_pc", label: "Renda per capita", tr: Math.log },
  { key: "college_25", label: "Adultos com superior completo" },
  { key: "aux_share", label: "Famílias no Auxílio Brasil" },
  { key: "dist_big_km", label: "Distância até cidade grande" },
];

function corr(rows, xKey, yKey, tr = (v) => v) {
  const pts = rows.map((r) => [tr(r[xKey]), r[yKey]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const mx = d3.mean(pts, (p) => p[0]);
  const my = d3.mean(pts, (p) => p[1]);
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pts) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

function share(rows, year) {
  const valid = d3.sum(rows, (r) => r[`valid${year}`] ?? 0);
  const pt = d3.sum(rows, (r) => ((r[`pt${year}`] ?? 0) * (r[`valid${year}`] ?? 0)) / 100);
  return (100 * pt) / valid;
}

function deciles(year, key) {
  const rows = mun.filter((r) => r[`valid${year}`] && Number.isFinite(r[key])).sort((a, b) => a[key] - b[key]);
  const total = d3.sum(rows, (r) => r[`valid${year}`]);
  let cum = 0;
  const groups = d3.range(10).map(() => []);
  for (const r of rows) {
    groups[Math.min(9, Math.floor((10 * (cum + r[`valid${year}`] / 2)) / total))].push(r);
    cum += r[`valid${year}`];
  }
  return groups.map((g, i) => ({ year: String(year), decile: i + 1, value: share(g, year) }));
}

const fmtPct = (x) => (x == null ? "—" : `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const fmtR = (r) => r.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
const fmtBRL = (x) => `R$ ${Math.round(x).toLocaleString("pt-BR")}`;
const fmtKm = (x) => `${Math.round(x).toLocaleString("pt-BR")} km`;
const listPt = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

const corrRows = VARS.flatMap((v) => YEARS.map((year) => ({ var: v.label, year, r: corr(mun, v.key, `pt${year}`, v.tr) })));
const rOf = (key, year) => corrRows.find((d) => d.var === VARS.find((v) => v.key === key).label && d.year === year).r;
const byRegion = (key, year = 2022) =>
  REGIONS.map((region) => {
    const v = VARS.find((x) => x.key === key);
    return { region, r: corr(mun.filter((m) => m.region === region), key, `pt${year}`, v.tr) };
  });

const nat2022 = share(mun, 2022);
const incDec = YEARS.flatMap((y) => deciles(y, "income_pc"));
const dec = (year, i) => incDec.find((d) => d.year === String(year) && d.decile === i).value;
const regionShare = REGIONS.map((region) => ({ region, value: share(mun.filter((m) => m.region === region), 2022) }));
const incomeByRegion = byRegion("income_pc");
const auxByRegion = byRegion("aux_share");
const distByRegion = byRegion("dist_big_km");
const distPos = distByRegion.filter((d) => d.r > 0.15).map((d) => d.region);
const distNeg = distByRegion.filter((d) => d.r < -0.15).map((d) => d.region);
const auxHigh = mun.filter((m) => m.aux_share >= 50);
const auxLow = mun.filter((m) => m.aux_share < 20);
const over100 = mun.filter((m) => m.aux_share > 100).length;
const AUX_BINS = [
  [0, 20, "menos de 20"],
  [20, 35, "20 a 35"],
  [35, 50, "35 a 50"],
  [50, Infinity, "50 ou mais"],
];
const auxBins = AUX_BINS.map(([lo, hi, label]) => {
  const g = mun.filter((m) => m.aux_share >= lo && m.aux_share < hi && m.valid2018);
  const v2018 = share(g, 2018);
  const v2022 = share(g, 2022);
  return { label, n: g.length, v2018, v2022, swing: v2022 - v2018 };
});
const swingR = corr(mun.map((m) => ({ ...m, swing: m.pt2022 - m.pt2018 })), "aux_share", "swing");
const fmtSwing = (x) => `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" })} p.p.`;
const bigCities = mun.filter((m) => m.pop >= 500000).length;

function regionColor() {
  return { legend: true, domain: REGIONS, range: REGION_COLORS };
}

function scatter(width, { key, label, log = false, format }) {
  return Plot.plot({
    width,
    height: Math.round(Math.max(300, Math.min(460, width * 0.62))),
    marginLeft: 48,
    x: { type: log ? "log" : "linear", label, grid: true, tickFormat: format },
    y: { label: `voto em Lula no 2º turno de 2022 (%)`, domain: [0, 100], grid: true },
    color: regionColor(),
    marks: [
      Plot.ruleY([50], { stroke: "#94a3b8", strokeDasharray: "3,3" }),
      Plot.dot(mun.filter((m) => Number.isFinite(m[key]) && (!log || m[key] > 0)), {
        x: key,
        y: "pt2022",
        r: 1.6,
        fill: "region",
        fillOpacity: 0.55,
        tip: true,
        channels: { Município: (m) => `${m.name} (${m.uf})` },
        title: (m) => `${m.name} (${m.uf})\n${label}: ${format ? format(m[key]) : m[key]}\nLula: ${fmtPct(m.pt2022)}`,
      }),
    ],
  });
}

function regionBars(width, rows, { label }) {
  return Plot.plot({
    width,
    height: 200,
    marginLeft: 100,
    x: { domain: [-1, 1], label, grid: true, tickFormat: fmtR },
    y: { label: null, domain: REGIONS },
    color: regionColor(),
    marks: [
      Plot.ruleX([0]),
      Plot.barX(rows, { x: "r", y: "region", fill: "region" }),
      Plot.text(rows.filter((d) => d.r >= 0), { x: "r", y: "region", text: (d) => fmtR(d.r), textAnchor: "start", dx: 4, fontSize: 11 }),
      Plot.text(rows.filter((d) => d.r < 0), { x: "r", y: "region", text: (d) => fmtR(d.r), textAnchor: "end", dx: -4, fontSize: 11 }),
    ],
  });
}

function html_lede(kicker, title, value, neg = false) {
  return html`<div class="lede">
    <div class="lede-kicker">${kicker}</div>
    <div class="lede-title">${title}</div>
    <div class="lede-big ${neg ? "neg" : ""}">${value}</div>
  </div>`;
}
```

```js
html`<div class="lede-grid">
  ${html_lede("Lula, 2º turno de 2022", "votos válidos nos municípios", fmtPct(nat2022))}
  ${html_lede("Renda × voto no PT, 2002", "correlação entre municípios", fmtR(rOf("income_pc", 2002)))}
  ${html_lede("Renda × voto no PT, 2022", "correlação entre municípios", fmtR(rOf("income_pc", 2022)), true)}
</div>`
```

## Como ler esta página

A unidade é o município. Para cada um, a página compara a porcentagem de votos válidos do candidato do PT no segundo turno com indicadores do Censo 2022 e com o número de famílias que receberam o Auxílio Brasil em outubro de 2022, o mês da eleição.

A medida de associação é a correlação. Ela vai de −1 a +1. Perto de +1, os municípios com mais de uma coisa têm também mais da outra; perto de −1, têm menos; perto de zero, não há relação em linha reta. Nas correlações, cada município conta igual: uma cidade de 2 mil habitantes pesa o mesmo que São Paulo. Os gráficos por faixa de renda, mais abaixo, pesam cada município pelo número de eleitores.

<div class="takeaway">
  <strong>Município não é eleitor.</strong>
  <span>Saber que municípios mais pobres votam mais no PT não diz, sozinho, que os eleitores mais pobres votam mais no PT. Para isso é preciso pesquisa com eleitores, e a página traz uma delas na seção sobre escolaridade.</span>
</div>

## A virada de 2006

Em 2002, o voto em Lula era um pouco mais alto nos municípios de renda maior: a correlação com a renda foi ${fmtR(rOf("income_pc", 2002))}. Em 2006, depois do primeiro mandato, ela virou ${fmtR(rOf("income_pc", 2006))}. Desde então, o PT tem mais votos onde a renda é menor. A correlação foi ${fmtR(rOf("income_pc", 2010))} em 2010, ${fmtR(rOf("income_pc", 2014))} em 2014, ${fmtR(rOf("income_pc", 2018))} em 2018 e ${fmtR(rOf("income_pc", 2022))} em 2022.

${resize((width) => Plot.plot({
  width,
  height: Math.round(Math.max(260, Math.min(380, width * 0.55))),
  marginLeft: 44,
  x: { label: null, ticks: YEARS, tickFormat: "d" },
  y: { label: "correlação com o voto no PT", domain: [-1, 1], grid: true, tickFormat: fmtR },
  color: { legend: true, domain: VARS.map((v) => v.label), range: ["#1e3a8a", "#0f766e", "#b45309", "#94a3b8"] },
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(corrRows, { x: "year", y: "r", stroke: "var", strokeWidth: 2 }),
    Plot.dot(corrRows, { x: "year", y: "r", fill: "var", r: 3.5, tip: true, title: (d) => `${d.var}, ${d.year} (${CANDIDATE[d.year]}): ${fmtR(d.r)}` }),
  ],
}))}

Todos os indicadores são de 2022. Para as eleições anteriores, o gráfico mostra como votaram os municípios que *hoje* são mais pobres, mais escolarizados ou mais dependentes do Auxílio Brasil. É uma aproximação: a posição relativa de um município pode ter mudado em vinte anos.

A mesma virada aparece dividindo o eleitorado em dez faixas iguais, da que vive nos municípios de menor renda à que vive nos de maior renda. Em 2002, Lula teve ${fmtPct(dec(2002, 1))} na faixa mais pobre e ${fmtPct(dec(2002, 10))} na mais rica. Em 2022, ${fmtPct(dec(2022, 1))} e ${fmtPct(dec(2022, 10))}.

${resize((width) => Plot.plot({
  width,
  height: Math.round(Math.max(260, Math.min(380, width * 0.55))),
  marginLeft: 44,
  x: { label: "faixas do eleitorado, da renda municipal mais baixa (1) à mais alta (10)", ticks: d3.range(1, 11) },
  y: { label: "voto no PT no 2º turno (%)", domain: [0, 100], grid: true },
  color: { legend: true, domain: YEARS.map(String), range: ["#b45309", "#d6b38a", "#cbd5e1", "#94a3b8", "#64748b", "#1e3a8a"] },
  marks: [
    Plot.ruleY([50], { stroke: "#94a3b8", strokeDasharray: "3,3" }),
    Plot.lineY(incDec.filter((d) => !["2002", "2022"].includes(d.year)), { x: "decile", y: "value", stroke: "year", strokeWidth: 1.5 }),
    Plot.lineY(incDec.filter((d) => ["2002", "2022"].includes(d.year)), { x: "decile", y: "value", stroke: "year", strokeWidth: 3 }),
    Plot.dot(incDec, { x: "decile", y: "value", fill: "year", r: 3, tip: true, title: (d) => `${d.year} (${CANDIDATE[d.year]}), faixa ${d.decile}: ${fmtPct(d.value)}` }),
  ],
}))}

## Renda

Cada ponto abaixo é um município. Os de renda mais baixa ficam à esquerda e quase todos deram maioria a Lula. Nos de renda mais alta, ele perdeu na maior parte.

${resize((width) => scatter(width, { key: "income_pc", label: "renda domiciliar per capita, Censo 2022 (escala logarítmica)", log: true, format: fmtBRL }))}

A região pesa muito. Lula teve ${fmtPct(regionShare.find((d) => d.region === "Nordeste").value)} dos votos válidos no Nordeste e ${fmtPct(regionShare.find((d) => d.region === "Sul").value)} no Sul. Como o Nordeste é também a região mais pobre, parte da correlação nacional pode ser efeito de região. Mas a relação continua dentro de cada região: em todas, municípios de renda menor votaram mais em Lula.

${resize((width) => regionBars(width, incomeByRegion, { label: "correlação entre renda e voto em Lula, 2022, dentro de cada região" }))}

## Auxílio Brasil

O Auxílio Brasil substituiu o Bolsa Família entre novembro de 2021 e fevereiro de 2023. Em agosto de 2022, dois meses antes da eleição, o governo Bolsonaro elevou o benefício mínimo para R$ 600. Ainda assim, os municípios com mais famílias atendidas votaram mais em Lula, o candidato da oposição. A correlação foi ${fmtR(rOf("aux_share", 2022))}.

Nos ${auxHigh.length.toLocaleString("pt-BR")} municípios com 50 ou mais famílias beneficiárias para cada 100 domicílios, Lula teve ${fmtPct(share(auxHigh, 2022))} dos votos válidos. Nos ${auxLow.length.toLocaleString("pt-BR")} com menos de 20, teve ${fmtPct(share(auxLow, 2022))}.

${resize((width) => scatter(width, { key: "aux_share", label: "famílias no Auxílio Brasil por 100 domicílios, outubro de 2022", format: (x) => x.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) }))}

Isso não mostra que o benefício mudou votos. Os municípios com mais beneficiários são os mais pobres, e a renda já explica quase a mesma coisa: as duas correlações têm quase o mesmo tamanho. Dentro de cada região a relação é mais fraca, sobretudo no Nordeste, onde quase todos os municípios têm muitos beneficiários e quase todos votaram em Lula.

${resize((width) => regionBars(width, auxByRegion, { label: "correlação entre Auxílio Brasil e voto em Lula, 2022, dentro de cada região" }))}

### O que mudou de 2018 para 2022

O nível do voto mostra sobretudo pobreza. A mudança entre uma eleição e outra diz mais. De 2018 para 2022, o PT subiu de ${fmtPct(share(mun, 2018))} para ${fmtPct(nat2022)}. Mas o ganho não foi igual em todo lugar: foi grande onde há poucos beneficiários do Auxílio Brasil e negativo onde há muitos.

${resize((width) => Plot.plot({
  width,
  height: 230,
  marginLeft: 130,
  marginRight: 20,
  x: {
    domain: [Math.min(0, d3.min(auxBins, (d) => d.swing)) - 1, d3.max(auxBins, (d) => d.swing) + 9],
    label: "variação do voto no PT, 2018 → 2022 (pontos percentuais)",
    grid: true,
    tickFormat: (x) => x.toLocaleString("pt-BR", { signDisplay: "exceptZero" }),
  },
  y: { label: "famílias no Auxílio por 100 domicílios", domain: auxBins.map((d) => d.label) },
  marks: [
    Plot.ruleX([0]),
    Plot.barX(auxBins, { x: "swing", y: "label", fill: (d) => (d.swing < 0 ? "#b45309" : "#1e3a8a"), tip: true, title: (d) => `${d.label}: ${d.n.toLocaleString("pt-BR")} municípios\n${fmtPct(d.v2018)} em 2018 → ${fmtPct(d.v2022)} em 2022` }),
    Plot.text(auxBins, { x: (d) => Math.max(0, d.swing), y: "label", text: (d) => `${fmtSwing(d.swing)}  (${fmtPct(d.v2018)} → ${fmtPct(d.v2022)})`, textAnchor: "start", dx: 4, fontSize: 11 }),
  ],
}))}

A correlação entre a fatia de beneficiários e a variação do voto foi ${fmtR(swingR)}, e ela é negativa em todas as regiões. Esse é o padrão que a literatura sobre o Bolsa Família descreve: programas de transferência tendem a favorecer quem está no governo, seja qual for o partido. Estudos como os de Hunter e Power (2007) e de Cesar Zucco (2013) encontraram esse efeito a favor do PT quando o PT governava.

Há outra explicação, que estes dados não conseguem separar da primeira. Onde Haddad já tinha ${fmtPct(auxBins.at(-1).v2018)} em 2018, sobrava pouco espaço para subir; onde tinha ${fmtPct(auxBins[0].v2018)}, sobrava muito. Parte do padrão pode ser só isso.

## Escolaridade

Nos municípios com mais adultos com diploma universitário, Lula teve menos votos: a correlação foi ${fmtR(rOf("college_25", 2022))}. Aqui a diferença entre município e eleitor importa. Na última pesquisa Datafolha antes do segundo turno de 2022, com 8.308 entrevistas, Lula tinha 61% dos votos válidos entre eleitores com ensino fundamental, 49% entre os com ensino médio e 49% entre os com ensino superior.

${resize((width) => scatter(width, { key: "college_25", label: "% de adultos de 25 anos ou mais com superior completo, Censo 2022", format: (x) => fmtPct(x) }))}

Ou seja: entre eleitores, a divisão por escolaridade está entre quem estudou pouco e o resto. Entre quem tem ensino médio e quem tem diploma, a pesquisa deu empate. A correlação municipal forte vem em boa parte de outra coisa: municípios com mais diplomados são também mais ricos e mais urbanos.

Na mesma pesquisa, a divisão por renda foi mais nítida. Lula tinha 61% dos válidos entre eleitores com renda familiar de até 2 salários mínimos, 45% entre 2 e 5, 42% entre 5 e 10 e 39% acima de 10 salários.

${resize((width) => Plot.plot({
  width,
  height: 240,
  marginLeft: 150,
  x: { domain: [0, 100], label: "Lula, % dos votos válidos (Datafolha, 28 e 29/10/2022)", grid: true },
  y: { label: null, domain: ["Fundamental", "Médio", "Superior", "Até 2 SM", "2 a 5 SM", "5 a 10 SM", "Mais de 10 SM"] },
  marks: [
    Plot.ruleX([50], { stroke: "#94a3b8", strokeDasharray: "3,3" }),
    Plot.barX(
      [
        { g: "Fundamental", v: 61, t: "escolaridade" }, { g: "Médio", v: 49, t: "escolaridade" }, { g: "Superior", v: 49, t: "escolaridade" },
        { g: "Até 2 SM", v: 61, t: "renda" }, { g: "2 a 5 SM", v: 45, t: "renda" }, { g: "5 a 10 SM", v: 42, t: "renda" }, { g: "Mais de 10 SM", v: 39, t: "renda" },
      ],
      { x: "v", y: "g", fill: (d) => (d.t === "renda" ? "#1e3a8a" : "#0f766e") },
    ),
    Plot.text(
      [["Fundamental", 61], ["Médio", 49], ["Superior", 49], ["Até 2 SM", 61], ["2 a 5 SM", 45], ["5 a 10 SM", 42], ["Mais de 10 SM", 39]],
      { x: (d) => d[1], y: (d) => d[0], text: (d) => `${d[1]}%`, dx: 16, fontSize: 11 },
    ),
  ],
}))}

## Distância dos grandes centros

No país como um todo, a distância até uma cidade com mais de 500 mil habitantes quase não tem relação com o voto: a correlação foi ${fmtR(rOf("dist_big_km", 2022))}. Mas isso é a soma de dois padrões opostos.

${resize((width) => regionBars(width, distByRegion, { label: "correlação entre distância até cidade grande e voto em Lula, 2022" }))}

${distPos.length ? `No ${listPt(distPos)}, quanto mais longe dos grandes centros, mais voto em Lula: o interior votou mais nele que as capitais e seus arredores.` : ""} ${distNeg.length ? `No ${listPt(distNeg)}, é o contrário: muitos dos municípios mais distantes ficam na fronteira agrícola, onde Bolsonaro venceu.` : ""} Somados, os dois efeitos se cancelam.

${resize((width) => scatter(width, { key: "dist_big_km", label: `distância em linha reta até a cidade mais próxima com 500 mil habitantes ou mais (${bigCities} cidades)`, format: fmtKm }))}

## Limites desta página

- Correlação entre municípios não é comportamento de eleitor. Um município pobre que vota no PT pode ter eleitores pobres votando no outro candidato, e vice-versa.
- Os indicadores são de 2022. Para as eleições de 2002 a 2018, a página mostra como votaram os municípios que hoje têm cada perfil, não o perfil que tinham na época.
- O dado do Auxílio Brasil vem do arquivo de saques do Portal da Transparência: famílias que sacaram o benefício de outubro de 2022. Ele soma cerca de 20 milhões de famílias, um pouco menos que o total pago divulgado pelo governo. O Cadastro Único conta famílias de um jeito diferente do Censo, que conta domicílios; por isso ${over100} municípios têm mais famílias beneficiárias do que domicílios.
- A renda e a escolaridade do Censo 2022 são resultados preliminares da amostra.
- A distância é em linha reta, não por estrada.
- Os votos no exterior ficam de fora, porque não pertencem a nenhum município. Por isso o total pode diferir em décimos do resultado oficial.
- A comparação entre 2018 e 2022 usa a fatia de beneficiários de 2022 nas duas eleições, e não separa o efeito do programa de outros fatores, como o teto natural do voto onde ele já era muito alto.
- Nada aqui identifica causas.

Fontes: Tribunal Superior Eleitoral, votação por partido e município, 2002–2022 · Portal da Transparência (CGU), saques do Auxílio Brasil, outubro de 2022 · IBGE, Censo 2022, tabelas SIDRA 4709 (população), 4712 (domicílios), 10295 (rendimento domiciliar per capita) e 10061 (nível de instrução) · Coordenadas dos municípios: [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros); correspondência entre códigos do TSE e do IBGE: [betafcc/Municipios-Brasileiros-TSE](https://github.com/betafcc/Municipios-Brasileiros-TSE) · Datafolha, [pesquisa de 28 e 29 de outubro de 2022](https://static.poder360.com.br/2022/12/datafolha-BR-082972022-1.pdf) (BR-08297/2022) · Hunter, W. e Power, T. J. (2007), "Rewarding Lula: Executive Power, Social Policy, and the Brazilian Elections of 2006", *Latin American Politics and Society* · Zucco, C. (2013), "When Payouts Pay Off: Conditional Cash Transfers and Voting Behavior in Brazil 2002–10", *American Journal of Political Science*.
