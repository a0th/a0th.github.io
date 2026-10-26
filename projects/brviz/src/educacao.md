---
toc:
  label: Nesta página
---

# Educação

Esta página abre a seção de educação do [relatório](./). O grupo de comparação é o mesmo: países cuja renda per capita em 1990 ficava entre 65% e 135% da brasileira. Os números saem das séries já baixadas — PISA, gasto público em educação e gasto por aluno do ensino médio.

```js
import { load, series, at, last, keep, NAMES } from "./components/data.js";
import { metricPlot, barDelta, spendPisaPlot } from "./components/plots.js";

const wdi = await FileAttachment("./data/wdi.csv").csv({ typed: true });
const pisa = await FileAttachment("./data/pisa.csv").csv({ typed: true });
const d = load(wdi, pisa);

const math = series("pisa_math", pisa);
const read = series("pisa_read", pisa);
const sci = series("pisa_sci", pisa);
const pupil = series("edu_pupil_sec", wdi);
const ppp = series("gdp_pc_ppp", wdi);

const peers = [...d.club90, "OECD"];
const math90 = keep(math, peers);
const read90 = keep(read, peers);
const sci90 = keep(sci, peers);
const pupil90 = keep(pupil, d.club90);

function yearsOf(rows, iso) {
  return rows
    .filter((row) => row.iso === iso)
    .map((row) => row.year)
    .sort((a, b) => a - b);
}

function commonStart(rows, iso = "OECD") {
  const mine = new Set(yearsOf(rows, "BRA"));
  return yearsOf(rows, iso).find((year) => mine.has(year));
}

function rankOf(values, iso) {
  const sorted = values
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value);
  return { pos: sorted.findIndex((row) => row.iso === iso) + 1, n: sorted.length };
}

function change(rows, iso, y0, y1) {
  const a = at(rows, iso, y0);
  const b = at(rows, iso, y1);
  return a == null || b == null ? undefined : b - a;
}

function levelRows(rows, isos) {
  return isos
    .map((iso) => ({ iso, value: last(rows, iso)?.value }))
    .filter((row) => Number.isFinite(row.value));
}

function deltaRows(rows, y0, y1) {
  return peers
    .map((iso) => {
      const value = change(rows, iso, y0, y1);
      if (value == null) return;
      return {
        iso,
        name: NAMES[iso] ?? iso,
        value,
        tone: iso === "BRA" ? "bra" : iso === "OECD" ? "group" : "peer",
      };
    })
    .filter((row) => row);
}

function moved(x) {
  if (x == null) return "não tem a série nos dois anos";
  const n = d.fmtIdx(Math.abs(x));
  const unit = n === "1" ? "ponto" : "pontos";
  if (Math.abs(x) < 0.5) return "ficou no mesmo ponto";
  return x > 0 ? `ganhou ${n} ${unit}` : `perdeu ${n} ${unit}`;
}

const mathStart = commonStart(math);
const readStart = commonStart(read);
const sciStart = commonStart(sci);
const mathEnd = last(math, "BRA")?.year;
const readEnd = last(read, "BRA")?.year;
const sciEnd = last(sci, "BRA")?.year;

const braMath = last(math, "BRA")?.value;
const oecdMath = last(math, "OECD")?.value;
const polMath = last(math, "POL")?.value;
const korMath = last(math, "KOR")?.value;
const braRead = last(read, "BRA")?.value;
const braSci = last(sci, "BRA")?.value;
const oecdRead = last(read, "OECD")?.value;
const oecdSci = last(sci, "OECD")?.value;

const mathGap0 = at(math, "OECD", mathStart) - at(math, "BRA", mathStart);
const mathGap1 = oecdMath - braMath;
const mathClosed = mathGap0 - mathGap1;
const mathFromBra = change(math, "BRA", mathStart, mathEnd);
const mathFromOecd = -change(math, "OECD", mathStart, mathEnd);
const mathSince12 = change(math, "BRA", 2012, mathEnd);
const readSince12 = change(read, "BRA", 2012, readEnd);
const sciSince12 = change(sci, "BRA", 2012, sciEnd);

const rankMath = rankOf(levelRows(math, d.club90), "BRA");
const rankRead = rankOf(levelRows(read, d.club90), "BRA");
const rankSci = rankOf(levelRows(sci, d.club90), "BRA");

const korOverBra = last(ppp, "KOR")?.value / last(ppp, "BRA")?.value;

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
  ${lede("PISA matemática", String(mathEnd), d.fmtIdx(braMath))}
  ${lede("Atrás da média da OCDE", "pontos em matemática", d.fmtIdx(mathGap1), true)}
  ${lede("Gasto público", `% do PIB · ${d.eduBra?.year}`, d.fmtPct(d.eduBra?.value))}
</div>`
```

## O que o PISA mede

O PISA testa alunos de 15 anos em matemática, leitura e ciências. É a comparação internacional mais usada para o que a escola consegue ensinar. Não mede a universidade, nem a qualidade de cada rede, nem o quanto um adulto aprendeu ao longo da vida.

O Brasil não fez todas as edições desde o início. A primeira prova em comum com a média da OCDE é ${mathStart} em matemática, ${readStart} em leitura e ${sciStart} em ciências. A última edição nestes dados é ${mathEnd}.

## Matemática: subiu até 2012 e depois caiu

Em ${mathEnd}, o Brasil marcou ${d.fmtIdx(braMath)} pontos. A média da OCDE foi ${d.fmtIdx(oecdMath)}, a Polônia marcou ${d.fmtIdx(polMath)} e a Coreia, ${d.fmtIdx(korMath)}. Entre os pares que fizeram a prova, o Brasil ficou em ${rankMath.pos}º de ${rankMath.n}.

<div class="takeaway">
  <strong>A distância para a OCDE encolheu ${d.fmtIdx(mathClosed)} pontos, dos dois lados.</strong>
  <span>Desde ${mathStart}, o Brasil ${moved(mathFromBra)} e a média da OCDE ${moved(-mathFromOecd)}. A diferença caiu de ${d.fmtIdx(mathGap0)} para ${d.fmtIdx(mathGap1)}. ${d.fmtIdx(mathFromBra)} pontos dessa aproximação vieram da subida brasileira e ${d.fmtIdx(mathFromOecd)} da queda da OCDE.</span>
</div>

Parte desse ganho foi devolvida. De 2012 a ${mathEnd}, o Brasil ${moved(mathSince12)} em matemática.

${resize((width) => metricPlot(math90, {width, yLabel: "PISA matemática", markRefs: true, rules: [2012], format: d.fmtIdx}))}

O gráfico abaixo é a variação de cada país entre ${mathStart} e ${mathEnd}, em pontos. A média da OCDE entra como referência. Quem não fez a prova nos dois anos fica de fora.

${resize((width) => barDelta(deltaRows(math, mathStart, mathEnd), {width, xLabel: `variação ${mathStart}–${mathEnd} (pontos)`, format: (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0, signDisplay: "exceptZero" })}))}

## Leitura e ciências

Leitura e ciências não repetem a queda da matemática. Em leitura o Brasil ainda subiu um pouco depois de 2012. Em ciências ficou quase no mesmo lugar, e em último entre os pares com dado.

Em leitura, o Brasil tem ${d.fmtIdx(braRead)} pontos em ${readEnd}, contra ${d.fmtIdx(oecdRead)} na média da OCDE. É o ${rankRead.pos}º de ${rankRead.n} pares com dado. Desde ${readStart}, o Brasil ${moved(change(read, "BRA", readStart, readEnd))} e a OCDE ${moved(change(read, "OECD", readStart, readEnd))}. De 2012 para cá, o Brasil ${moved(readSince12)}.

${resize((width) => metricPlot(read90, {width, yLabel: "PISA leitura", markRefs: true, rules: [2012], format: d.fmtIdx}))}

Em ciências, o Brasil tem ${d.fmtIdx(braSci)} pontos em ${sciEnd}, contra ${d.fmtIdx(oecdSci)} na média da OCDE. É o ${rankSci.pos}º de ${rankSci.n} pares com dado. Desde ${sciStart}, o Brasil ${moved(change(sci, "BRA", sciStart, sciEnd))} e a OCDE ${moved(change(sci, "OECD", sciStart, sciEnd))}. De 2012 para cá, o Brasil ${moved(sciSince12)}.

${resize((width) => metricPlot(sci90, {width, yLabel: "PISA ciências", markRefs: true, rules: [2012], format: d.fmtIdx}))}

## O Brasil gasta pouco ou gasta mal?

A pergunta mistura duas coisas. Como fatia do PIB, o Brasil não gasta pouco. Por aluno, fica perto da Polônia e abaixo da Coreia. A nota fica longe das duas.

Como fatia do PIB, o gasto público brasileiro em educação é ${d.fmtPct(d.eduBra?.value)} em ${d.eduBra?.year}. A Polônia está em ${d.fmtPct(d.eduPol?.value)} (${d.eduPol?.year}) e a Coreia em ${d.fmtPct(d.eduKor?.value)} (${d.eduKor?.year}). Essa fatia não é gasto por aluno. O Brasil tem proporcionalmente mais crianças e jovens em idade escolar, então o mesmo percentual se divide entre mais gente.

${resize((width) => metricPlot(d.edu90, {width, yLabel: "gasto público em educação (% do PIB)"}))}

Por aluno do ensino médio, o gasto público brasileiro foi ${d.fmtPct(d.pupilBra?.value)} da renda per capita em ${d.pupilBra?.year}. A Polônia gastou ${d.fmtPct(d.pupilPol?.value)} em ${d.pupilPol?.year}, e a Coreia ${d.fmtPct(d.pupilKor?.value)} em ${d.pupilKor?.year}. Em dinheiro, a distância para a Coreia é maior, porque a renda per capita coreana é cerca de ${korOverBra.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} vezes a brasileira. Essa série tem falhas e termina antes do PISA de ${mathEnd}.

${resize((width) => metricPlot(pupil90, {width, yLabel: "gasto por aluno do ensino médio (% da renda per capita)"}))}

Dizer que o Brasil “gasta muito e aprende pouco” acerta o aprendizado e erra o gasto. A fatia do PIB é parecida com a da Coreia e maior que a da Polônia. Por aluno, o Brasil fica perto da Polônia. Mesmo assim, fica ${d.fmtIdx(polMath - braMath)} pontos atrás dela em matemática.

Nos gráficos abaixo, cada ponto é um país. A linha tracejada é a média da OCDE em matemática. O ano do gasto e o ano do PISA não são os mesmos: cada país entra com o dado mais recente de cada série.

${resize((width) => spendPisaPlot(d.spendPisa, {width, oecd: oecdMath}))}

${resize((width) => spendPisaPlot(d.spendPisaPupil, {width, oecd: oecdMath, xLabel: "% da renda per capita, por aluno", unit: "% renda per capita por aluno"}))}

## O que isso não diz

- O PISA é uma prova de alunos de 15 anos. Um país pode melhorar a universidade, a educação infantil ou a formação de adultos sem isso aparecer aqui.
- Nem todo par fez todas as edições. Os rankings contam só quem tem dado na última prova disponível.
- Gasto por aluno do ensino médio falta em vários anos e acaba antes de ${mathEnd}. Comparar esse número com o PISA recente mistura datas.
- Os gráficos não identificam a causa. Em matemática o Brasil subiu até 2012 e depois devolveu parte do ganho. Um gasto por aluno perto do da Polônia convive com uma nota muito menor.

Fontes: OECD PISA, tabelas I.B1.5.4–6, via Our World in Data · World Bank WDI (`SE.XPD.TOTL.GD.ZS`, `SE.XPD.SECO.PC.ZS`). O grupo de pares é o mesmo do [relatório](./).
