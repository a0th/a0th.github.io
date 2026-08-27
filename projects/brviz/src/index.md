---
toc:
  label: Nesta página
---

# Brasil vs pares

World Bank WDI, WGI, Fraser EFW, e OECD PISA por ciclo. PPP, produtividade, regras, e o que o aluno de 15 anos consegue fazer. Azul-escuro = Brasil.

```js
import {load} from "./components/data.js";
import {metricPlot, barDelta, spendPisaPlot} from "./components/plots.js";

const wdi = FileAttachment("./data/wdi.csv").csv({typed: true});
const pisa = FileAttachment("./data/pisa.csv").csv({typed: true});
const {
  namesOf,
  club90,
  ppp90,
  ppp90rel,
  pppWaveRel,
  prod90rel,
  prodWaveRel,
  inv,
  trd,
  rq90,
  days90,
  efw90,
  pisa90,
  edu90,
  gini90,
  pov90,
  hunger90,
  waveBoom,
  prodWaveBoom,
  pppBra,
  pppUmc,
  pppPol,
  invBra,
  invUmc,
  trdBra,
  trdMex,
  trdPol,
  eduBra,
  eduUmc,
  eduPol,
  eduKor,
  bra90rel,
  pol90rel,
  kor90rel,
  zaf90rel,
  braWaveRel,
  chlWaveRel,
  idnWaveRel,
  braProdRel,
  polProdRel,
  korProdRel,
  zafProdRel,
  braProdWave,
  chlProdWave,
  idnProdWave,
  braPisa,
  oecdPisa,
  korPisa,
  polPisa,
  braPisaRead,
  braPisaSci,
  braGini,
  polGini,
  korGini,
  zafGini,
  braPov,
  umcPov,
  polPov,
  korPov,
  zafPov,
  povBra90,
  braHunger,
  umcHunger,
  zafHunger,
  hungerBra01,
  braRq,
  polRq,
  korRq,
  chlRq,
  braDays,
  chlDays,
  polDays,
  korDays,
  braEfw,
  chlEfw,
  polEfw,
  korEfw,
  spendPisa,
  fmtX,
  fmtPct,
  fmtIdx,
  fmtGini,
  fmt2,
  fmtDays
} = load(wdi, pisa);
```

<div class="grid grid-cols-3">
  <div class="card">
    <div class="card-title">PIB per capita PPP</div>
    <span class="muted">Brasil, ${pppBra?.y0}→${pppBra?.y1}</span>
    <div class="big">${fmtX(pppBra?.x)}</div>
    <span class="muted">UMC ${fmtX(pppUmc?.x)} · Polônia ${fmtX(pppPol?.x)}</span>
  </div>
  <div class="card">
    <div class="card-title">Investimento</div>
    <span class="muted">formação bruta de capital, ${invBra?.year}</span>
    <div class="big">${fmtPct(invBra?.value)}</div>
    <span class="muted">UMC ${fmtPct(invUmc?.value)}</span>
  </div>
  <div class="card">
    <div class="card-title">Comércio</div>
    <span class="muted">(X+M) / PIB, ${trdBra?.year}</span>
    <div class="big">${fmtPct(trdBra?.value)}</div>
    <span class="muted">México ${fmtPct(trdMex?.value)} · Polônia ${fmtPct(trdPol?.value)}</span>
  </div>
</div>

## Pares em 1990

Corte por nível, não por modelo. Em 1990 o PPP ficou entre 65% e 135% do Brasil: ${namesOf(club90)}. A faixa mede proximidade de renda na largada.

> Coreia, Polônia, Turquia, Chile e Malásia saem na frente. África do Sul e Equador ficam no chão com o Brasil.

${resize((width) => metricPlot(ppp90, {width, yLabel: "intl $"}))}

## 1990 = 100

Mesmos países. Cada ponto é o PPP daquele ano dividido pelo PPP de 1990 do próprio país, vezes 100. Todos partem de 100; o gráfico mostra quem acelerou, não quem era mais rico.

> Brasil chega a ${fmtIdx(bra90rel)}. Polônia ${fmtIdx(pol90rel)}, Coreia ${fmtIdx(kor90rel)}. África do Sul ${fmtIdx(zaf90rel)}.

${resize((width) => metricPlot(ppp90rel, {width, yLabel: "1990 = 100", yRules: [100]}))}

## Onda commodity

Clube econômico, não estatístico. Mesmo choque do Brasil em 2003–2010: commodity + compra chinesa. Chile (cobre), Peru (minério), Colômbia (petróleo), Argentina e Uruguai (soja), Rússia (petróleo), Indonésia (commodity/China).

### PPP relativo a 1990

Eixo relativo a 1990, como no gráfico de cima.

> Brasil chega a ${fmtIdx(braWaveRel)}. Chile ${fmtIdx(chlWaveRel)}, Indonésia ${fmtIdx(idnWaveRel)}. Depois de 2010 o Brasil quase para; vários do clube seguem.

${resize((width) => metricPlot(pppWaveRel, {width, yLabel: "1990 = 100", yRules: [100], rules: [2003, 2010], colorful: true}))}

### Variação 2003–2010

2003–2010. Mesmas cores do gráfico de cima.

${resize((width) => barDelta(waveBoom, {width}))}

## Produtividade

PIB por ocupado, PPP constante 2021. Série ILO/Banco Mundial, começa em 1991. Não é TFP: é produto por pessoa que trabalha. Cada ponto é o valor daquele ano dividido pelo de 1991 do próprio país, vezes 100.

### Clube 1990

> Brasil chega a ${fmtIdx(braProdRel)}. Polônia ${fmtIdx(polProdRel)}, Coreia ${fmtIdx(korProdRel)}. África do Sul ${fmtIdx(zafProdRel)} — o mesmo chão.

${resize((width) => metricPlot(prod90rel, {width, yLabel: "1991 = 100", yRules: [100]}))}

### Clube commodity

Eixo relativo a 1991.

> Brasil chega a ${fmtIdx(braProdWave)}. Chile ${fmtIdx(chlProdWave)}, Indonésia ${fmtIdx(idnProdWave)}. Em 2003–2010 o Brasil sobe com o pacote; depois a produtividade quase para.

${resize((width) => metricPlot(prodWaveRel, {width, yLabel: "1991 = 100", yRules: [100], rules: [2003, 2010], colorful: true}))}

### Variação 2003–2010

Mesmas cores.

${resize((width) => barDelta(prodWaveBoom, {width}))}

## Investimento

Não é uma meta do tipo “o % tem de subir”. É o canal. PIB per capita cresce se a economia acumula máquina, infraestrutura e construção — e se usa isso com alguma produtividade. A série é formação bruta de capital / PIB.

Quem saiu da faixa do Brasil em 1990 (Coreia, Polônia, China, UMC) passou décadas investindo ~30% do PIB. O Brasil oscila em 15–22% e hoje está em ${fmtPct(invBra?.value)} contra ${fmtPct(invUmc?.value)} do UMC. Sem esse gap, o atraso no PPP fica difícil de explicar só com “azar” ou ciclo político.

> 40% à la China não é o alvo — pode ser overinvestment. 17% contra o clube que cresceu ×3 é o diagnóstico.

${resize((width) => metricPlot(inv, {width, yLabel: "% PIB"}))}

## Comércio

Também não é meta de maximizar (X+M)/PIB. País grande tende a comerciar menos — gravidade. O ponto é outro: comércio traz bem de capital, concorrência e escala. A série é exportações + importações sobre o PIB.

México é grande e opera a ${fmtPct(trdMex?.value)}. Polônia, ${fmtPct(trdPol?.value)}. O Brasil está em ${fmtPct(trdBra?.value)} — fechado para o nível de renda. Menos máquina importada, menos concorrência, menos escala nos setores que exportam. É o segundo canal, ao lado do investimento.

> 200% não é o alvo. 36% contra México 75% e Polônia 100% é o diagnóstico.

${resize((width) => metricPlot(trd, {width, yLabel: "% PIB"}))}

## Instituições

Terceiro canal, ao lado de investimento e comércio. Regras, não máquina. Mesmo clube 1990.

### Qualidade regulatória

WGI: estimativa de especialistas, cerca de −2,5 a +2,5. Não é o ranking Doing Business. Série 1996–2024.

> Brasil ${fmt2(braRq?.value)} (${braRq?.year}). Polônia ${fmt2(polRq?.value)}. Coreia ${fmt2(korRq?.value)}. Chile ${fmt2(chlRq?.value)}.

${resize((width) => metricPlot(rq90, {width, yLabel: "estimativa", format: (v) => v.toLocaleString("pt-BR", {maximumFractionDigits: 2}), yRules: [0]}))}

### Dias para registrar uma LLC

Doing Business, caso padronizado. Série 2003–2019; o Brasil só entra em 2013. O projeto morreu em 2021.

> Brasil ${fmtDays(braDays?.value)} dias (${braDays?.year}). Chile ${fmtDays(chlDays?.value)}. Polônia ${fmtDays(polDays?.value)}. Coreia ${fmtDays(korDays?.value)}.

${resize((width) => metricPlot(days90, {width, yLabel: "dias", format: (v) => v.toLocaleString("pt-BR", {maximumFractionDigits: 1})}))}

### Fraser EFW

0–10. Cinco áreas: Estado, propriedade, moeda, comércio, regulação. 5 em 5 anos até 2000, depois anual. Índice corrente — não o painel encadeado. Último ano 2022.

> Brasil ${fmt2(braEfw?.value)} (${braEfw?.year}). Chile ${fmt2(chlEfw?.value)}. Polônia ${fmt2(polEfw?.value)}. Coreia ${fmt2(korEfw?.value)}.

${resize((width) => metricPlot(efw90, {width, yLabel: "0–10", format: (v) => v.toLocaleString("pt-BR", {maximumFractionDigits: 1})}))}

## PISA

Input = gasto. Output = nota. Não é meta de maximizar o %.

### Gasto em educação

% do PIB. Mesmo clube 1990. Série com buracos — o Brasil só começa em 1995.

> Brasil ${fmtPct(eduBra?.value)}. UMC ${fmtPct(eduUmc?.value)}. Polônia ${fmtPct(eduPol?.value)}. Coreia ${fmtPct(eduKor?.value)} — gasta parecido, tira ${fmtIdx(korPisa)}.

${resize((width) => metricPlot(edu90, {width, yLabel: "% PIB"}))}

### Matemática

Nota aos 15 anos. Ciclos OECD — 2003, 2006, 2009, 2012, 2015, 2018, 2022 — não ano civil. Tabela I.B1.5.4. Escala ancorada em ~500 na OCDE. Equador, África do Sul e agregados WDI não fizeram o teste.

> Brasil ${fmtIdx(braPisa)}. OCDE ${fmtIdx(oecdPisa)}. Coreia ${fmtIdx(korPisa)}, Polônia ${fmtIdx(polPisa)}. Gasta mais, tira menos.

${resize((width) => metricPlot(pisa90, {width, yLabel: "pontos", colorful: true}))}

### Gasto × nota

Último gasto (% PIB) × último PISA math. Quem tem as duas séries. Linha tracejada = média OCDE ${fmtIdx(oecdPisa)}. Não é gasto por aluno.

> Brasil ${fmtPct(eduBra?.value)} como Coreia ${fmtPct(eduKor?.value)}. Nota ${fmtIdx(braPisa)} contra ${fmtIdx(korPisa)}. Polônia gasta ${fmtPct(eduPol?.value)} e tira ${fmtIdx(polPisa)}.

${resize((width) => spendPisaPlot(spendPisa, {width, oecd: oecdPisa}))}

Leitura ${fmtIdx(braPisaRead)} · ciências ${fmtIdx(braPisaSci)} — o mesmo chão.

## Pobreza

Inquérito, não ano civil — PNAD, PIP. Sem ponto em 2010 no Brasil.

### Gini

Mesmo clube 1990. Sem UMC — Gini não se agrega.

> Brasil ${fmtGini(braGini?.value)}. Polônia ${fmtGini(polGini?.value)}. Coreia ${fmtGini(korGini?.value)}. África do Sul ${fmtGini(zafGini?.value)}. Caiu; continua alto.

${resize((width) => metricPlot(gini90, {width, yLabel: "Gini", format: (v) => v.toLocaleString("pt-BR", {maximumFractionDigits: 1})}))}

### Pobreza a $8.30/dia

% da população abaixo da linha típica de UMC (2021 PPP). Mesmo clube 1990 + UMC. Brasil ${fmtPct(povBra90)} em 1990.

> Brasil ${fmtPct(braPov?.value)}. UMC ${fmtPct(umcPov?.value)}. Polônia ${fmtPct(polPov?.value)}, Coreia ${fmtPct(korPov?.value)} — no piso. África do Sul ${fmtPct(zafPov?.value)}.

${resize((width) => metricPlot(pov90, {width, yLabel: "% pop", rules: [2003, 2010]}))}

### Subnutrição

% da população. FAO, 2001–2023. Abaixo de 2,5% o valor é esse piso, não zero. Brasil ${fmtPct(hungerBra01)} em 2001; depois cola no piso com Coreia e Polônia.

> Brasil ${fmtPct(braHunger?.value)}. UMC ${fmtPct(umcHunger?.value)}. África do Sul ${fmtPct(zafHunger?.value)}.

${resize((width) => metricPlot(hunger90, {width, yLabel: "% pop", yRules: [2.5]}))}

Hover destaca a linha do país. Fonte: World Bank WDI (PIP, FAO) · WGI Regulatory Quality · Doing Business / OWID (dias) · Fraser EFW via QoG · OECD PISA 2022 (I.B1.5.4–6).
