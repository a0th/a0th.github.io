---
toc:
  label: Nesta página
---

# O Brasil melhorou quase por inércia

```js
import { load, at, last } from "./components/data.js";
import { metricPlot, barDelta, spendPisaPlot, invGrowthPlot } from "./components/plots.js";

const wdi = await FileAttachment("./data/wdi.csv").csv({ typed: true });
const pisa = await FileAttachment("./data/pisa.csv").csv({ typed: true });
const d = load(wdi, pisa);

const ppp03 = at(d.ppp90rel, "BRA", 2003);
const ppp10 = at(d.ppp90rel, "BRA", 2010);
const boomShare =
  d.bra90rel != null && ppp03 != null && ppp10 != null && d.bra90rel !== 100
    ? (100 * (ppp10 - ppp03)) / (d.bra90rel - 100)
    : undefined;

const mfgZaf = last(d.mfg90, "ZAF")?.value;
const trdKor = last(d.trd, "KOR")?.value;
const trdZaf = last(d.trd, "ZAF")?.value;
const trdChn = last(d.trd, "CHN")?.value;
const trdInd = last(d.trd, "IND")?.value;
const hungerPol = last(d.hunger90, "POL")?.value;
const hungerKor = last(d.hunger90, "KOR")?.value;

const isosOf = (rows) => [...new Set(rows.map((row) => row.iso))];

function rankOf(values, iso) {
  const sorted = values
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value);
  return { pos: sorted.findIndex((row) => row.iso === iso) + 1, n: sorted.length };
}

const levelsAt = (rows, year) => isosOf(rows).map((iso) => ({ iso, value: at(rows, iso, year) }));

const growthAt = (rows, y0, y1) =>
  isosOf(rows).map((iso) => {
    const a = at(rows, iso, y0);
    const b = at(rows, iso, y1);
    return { iso, value: a == null || b == null ? undefined : (100 * (b - a)) / a };
  });

const meanExceptBra = (values) => {
  const list = values.filter((row) => row.iso !== "BRA" && Number.isFinite(row.value));
  return list.length ? list.reduce((sum, row) => sum + row.value, 0) / list.length : undefined;
};

const lastYear = last(d.ppp90, "BRA")?.year;
const braPpp90 = at(d.ppp90, "BRA", 1990);
const braPppNow = last(d.ppp90, "BRA")?.value;
const korPppNow = last(d.ppp90, "KOR")?.value;
const rankPpp90 = rankOf(levelsAt(d.ppp90, 1990), "BRA");
const rankPppNow = rankOf(levelsAt(d.ppp90, lastYear), "BRA");

const clubPost = growthAt(d.ppp90rel, 2010, lastYear);
const braPost = clubPost.find((row) => row.iso === "BRA")?.value;
const clubPostMean = meanExceptBra(clubPost);
const rankPost = rankOf(clubPost, "BRA");

const wavePost = growthAt(d.pppWaveRel, 2010, lastYear);
const wavePostMean = meanExceptBra(wavePost);
const waveBoomMean = meanExceptBra(d.waveBoom);

const clubLast = (rows) => d.club90.map((iso) => ({ iso, value: last(rows, iso)?.value }));
const rankProd = rankOf(clubLast(d.prod90rel), "BRA");
const rankTfp = rankOf(clubLast(d.tfp90rel), "BRA");
const rankInv = rankOf(clubLast(d.inv), "BRA");
const rankGini = rankOf(clubLast(d.gini90), "BRA");
const rankPov = rankOf(clubLast(d.pov90), "BRA");

const braProd10 = at(d.prod90rel, "BRA", 2010);
const braProdNow = last(d.prod90rel, "BRA")?.value;
const braProdPost =
  braProd10 != null && braProdNow != null ? (100 * (braProdNow - braProd10)) / braProd10 : undefined;

const povBoomCountries = d.povertyTable.filter((row) => !row.group);
const povBoomRank = {
  pos: povBoomCountries.findIndex((row) => row.iso === "BRA") + 1,
  n: povBoomCountries.length,
};

const pisaBra03 = at(d.pisa90, "BRA", 2003);
const pisaBra12 = at(d.pisa90, "BRA", 2012);
const pisaOecd03 = at(d.pisa90, "OECD", 2003);
const pisaGap03 = pisaOecd03 != null && pisaBra03 != null ? pisaOecd03 - pisaBra03 : undefined;
const pisaGapNow = d.oecdPisa != null && d.braPisa != null ? d.oecdPisa - d.braPisa : undefined;
const pisaBraGain = d.braPisa != null && pisaBra03 != null ? d.braPisa - pisaBra03 : undefined;
const pisaOecdDrop = pisaOecd03 != null && d.oecdPisa != null ? pisaOecd03 - d.oecdPisa : undefined;

function barCell(label, value, max, tone = "pos") {
  if (value == null || !Number.isFinite(value)) return html`<td><span class="muted">—</span></td>`;
  const width = max > 0 ? Math.min(100, (100 * Math.abs(value)) / max) : 0;
  const fill = value < 0 ? "neg" : tone === "bra" ? "bra" : "pos";
  return html`<td class="bar-td ${fill}" style="--bar-pct: ${width}%;">${label}</td>`;
}

function ledeTip(items) {
  if (!items?.length) return;
  return html`<div class="lede-tip">
    <div class="lede-tip-kicker">último dado de cada país</div>
    <table>
      ${items.map(
        (item) => html`<tr>
          <td>${item.name}</td>
          <td>${item.year}</td>
          <td>${d.fmtPct(item.value)}</td>
        </tr>`,
      )}
    </table>
  </div>`;
}

function ledeRows(rows) {
  const max = Math.max(0, ...rows.map((row) => Math.abs(row.value)).filter(Number.isFinite));
  const diverge = rows.some((row) => row.value > 0) && rows.some((row) => row.value < 0);
  return rows.map((row) => {
    const pct = max > 0 && Number.isFinite(row.value) ? Math.min(100, (100 * Math.abs(row.value)) / max) : 0;
    const cls = [row.tone, row.value < 0 ? "neg" : null, diverge ? "diverge" : null]
      .filter(Boolean)
      .join(" ");
    const track = diverge
      ? html`<span class="lede-track diverge">
          <span class="lede-half left"><i></i></span>
          <span class="lede-axis"></span>
          <span class="lede-half right"><i></i></span>
        </span>`
      : html`<span class="lede-track"><i></i></span>`;
    return html`<div class="lede-row-wrap">
      <div class="lede-row ${cls}" style="--pct: ${pct}%" tabindex=${row.items?.length ? 0 : undefined}>
        <span class="lede-name">${row.name}</span>
        ${track}
        <span class="lede-val">${d.fmtPct(row.value)}</span>
      </div>
      ${ledeTip(row.items)}
    </div>`;
  });
}

function indexLede(snap) {
  return {
    value: snap.value - 100,
    items: snap.items.map((item) => ({ name: item.name, year: item.year, value: item.value - 100 })),
  };
}

function fromZero(rows) {
  return rows.map((row) => ({ ...row, value: row.value - 100 }));
}

function ledeCard(title, kicker, value, rows) {
  return html`<div class="lede">
    <div class="lede-kicker">${kicker}</div>
    <div class="lede-title">${title}</div>
    <div class="lede-big ${value < 0 ? "neg" : ""}">${d.fmtPct(value)}</div>
    <div class="lede-bars">${ledeRows(rows)}</div>
  </div>`;
}

function pares(label = "pares") {
  const names = d.namesOf(d.club90).split(" · ");
  return html`<span class="term-pares" tabindex="0">${label}<span class="term-pares-tip" aria-hidden="true">
    <span class="lede-tip-kicker">grupo de comparação</span>
    <span class="term-pares-tip-note">Renda per capita PPP em 1990 entre 65% e 135% da brasileira.</span>
    <ul>${names.map((name) => html`<li>${name}</li>`)}</ul>
  </span></span>`;
}

const povertyBarMax = Math.max(
  ...d.povertyTable.flatMap((row) => [Math.abs(row.boom), Math.abs(row.after)]),
);
const povertyGroups = [d.povertyBrazil, d.povertyLatam, d.povertyExporters];
const povertyCountries = d.povertyTable.filter((row) => !row.group);

function povertyTableView(rows, nameHeader) {
  return html`<div class="score-wrap">
    <table class="score score-bars score-bars-start">
      <thead>
        <tr>
          <th>${nameHeader}</th>
          <th>Durante o boom<br><span class="muted">2001–05 → 2008–12</span></th>
          <th>Depois do boom<br><span class="muted">2008–12 → 2020–24</span></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => {
          const tone = row.iso === "BRA" ? "bra" : row.group ? "group" : "pos";
          return html`<tr class=${row.group ? "group-row" : ""}>
            <th class=${row.iso === "BRA" ? "bra" : ""}>${row.name}</th>
            ${barCell(d.fmtGini(row.boom), row.boom, povertyBarMax, tone)}
            ${barCell(d.fmtGini(row.after), row.after, povertyBarMax, tone)}
          </tr>`;
        })}
      </tbody>
    </table>
  </div>`;
}
```

Em três décadas, quase tudo melhorou no Brasil. A renda per capita subiu. A pobreza caiu para menos da metade. A fome chegou ao piso das estatísticas internacionais. A desigualdade recuou.

Este relatório faz outra pergunta. Não “o Brasil melhorou?”, mas “o Brasil melhorou mais ou menos que os países que estavam ao lado dele em 1990?”.

Na maioria dos indicadores, menos. O Brasil recebeu as melhoras que apareceram em quase todo o mundo e um empurrão forte das commodities entre 2003 e 2010. Onde o avanço depende de um motor próprio — produtividade, investimento, comércio, aprendizado escolar — o país ficou parado ou recuou.

É isso que chamamos de inércia: o Brasil andou porque o mundo andou.

Inércia descreve o resultado. Não é um veredito sobre governos. A comparação entre países mostra quem chegou mais longe; ela não mede o efeito de cada política. Quando um número admite mais de uma leitura, o texto mostra as duas.

```js
html`<div class="lede-grid">
  ${ledeCard("Crescimento da renda per capita", `1990 → ${last(d.ppp90rel, "BRA")?.year}`, d.bra90rel - 100, [
    {
      name: "Brasil",
      value: d.bra90rel - 100,
      tone: "bra",
      items: [{ name: "Brasil", year: last(d.ppp90rel, "BRA")?.year, value: d.bra90rel - 100 }],
    },
    { name: "Pares", tone: "pares", ...indexLede(d.clubPpp) },
    { name: "América Latina", ...indexLede(d.latamPpp) },
  ])}
  ${ledeCard("Eficiência da economia (TFP)", `1990 → ${last(d.tfp90rel, "BRA")?.year}`, d.braTfpRel - 100, [
    {
      name: "Brasil",
      value: d.braTfpRel - 100,
      tone: "bra",
      items: [{ name: "Brasil", year: last(d.tfp90rel, "BRA")?.year, value: d.braTfpRel - 100 }],
    },
    { name: "Pares", tone: "pares", ...indexLede(d.clubTfp) },
    { name: "América Latina", ...indexLede(d.latamTfp) },
  ])}
  ${ledeCard("Pobreza hoje", `% com menos de US$ 8,30 por dia · ${d.braPov?.year}`, d.braPov?.value, [
    {
      name: "Brasil",
      value: d.braPov?.value,
      tone: "bra",
      items: [{ name: "Brasil", year: d.braPov?.year, value: d.braPov?.value }],
    },
    { name: "Pares", tone: "pares", value: d.clubPovLast.value, items: d.clubPovLast.items },
    { name: "América Latina", value: d.latamPovLast.value, items: d.latamPovLast.items },
  ])}
</div>`
```

## Como a comparação funciona

Comparar o Brasil de 1990 com países que já eram ricos não ajuda ninguém. Por isso, os ${pares("pares")} deste relatório são os países que, em 1990, tinham renda per capita entre 65% e 135% da brasileira.

O grupo é ${d.namesOf(d.club90)}. Esses países não seguiram as mesmas políticas. Eles tinham apenas um ponto de partida parecido.

Três termos aparecem o tempo todo:

- **Renda per capita (PPP)**: tudo o que o país produz em um ano, dividido pela população, ajustado pela diferença de preços entre países. Um dólar PPP compra o mesmo em qualquer lugar.
- **Média simples**: um país, um voto. Não é a média do Banco Mundial, que pesa pela população e, na América Latina, acaba refletindo o próprio Brasil e o México.
- **Gráfico com base em 1990**: cada país começa em 0. Um valor de 100% quer dizer que o indicador dobrou desde 1990.

A comparação tem limites conhecidos. O grupo foi montado só pela renda de 1990, e não por tamanho, geografia ou instituições. Cada país teve choques próprios. Nada aqui prova causa.

Mesmo assim, o teste é claro e pode falhar. Se o Brasil tivesse crescido perto da mediana do grupo, ou se produtividade, investimento e aprendizado tivessem subido junto com a renda, a leitura de inércia não se sustentaria. É o contrário que aparece nos dados.

## A renda: o Brasil caiu de posição no grupo

Em 1990, a renda per capita do Brasil era de US$ ${d.fmtIdx(braPpp90)} PPP, a ${rankPpp90.pos}ª maior entre os ${rankPpp90.n} países do grupo. Em ${lastYear}, é de US$ ${d.fmtIdx(braPppNow)} e ocupa a ${rankPppNow.pos}ª posição.

O país não empobreceu. Ele foi ultrapassado.

<div class="takeaway">
  <strong>Desde 1990, o Brasil cresceu menos que quase todos os ${pares("pares")}.</strong>
  <span>A renda per capita subiu ${d.fmtPct(d.bra90rel - 100)} no Brasil, ${d.fmtPct(d.pol90rel - 100)} na Polônia e ${d.fmtPct(d.kor90rel - 100)} na Coreia. Só Equador e África do Sul avançaram menos; a Argentina ficou praticamente empatada.</span>
</div>

${resize((width) => metricPlot(fromZero(d.ppp90rel), {width, yLabel: "variação da renda per capita desde 1990 (%)", yRules: [0]}))}

Coreia e Polônia partiram de um patamar próximo ao brasileiro e hoje estão perto do dobro dele. Esse é o tamanho da distância aberta em uma geração.

## E dentro da América Latina?

O gráfico anterior mistura regiões. A pergunta seguinte é mais estreita: o Brasil ficou para trás dos vizinhos?

O gráfico abaixo cobre os países de língua espanhola e portuguesa da região. A linha tracejada é a média simples dos demais países do gráfico. Cuba e Venezuela não têm série de PPP. Honduras saiu do índice: o dado de 1990 no Banco Mundial está fora de escala com o dos vizinhos.

<div class="takeaway">
  <strong>O Brasil também ficou abaixo da média da região.</strong>
  <span>Desde 1990, a renda per capita subiu ${d.fmtPct(d.bra90rel - 100)} no Brasil e ${d.fmtPct(d.latamMeanRel - 100)} na média simples. Panamá, República Dominicana, Chile, Costa Rica e Peru avançaram muito mais. Apenas Equador, México e Haiti avançaram menos.</span>
</div>

<p class="group-legend"><span><i class="bra"></i> Brasil</span><span><i class="reference"></i> América Latina</span></p>

${resize((width) => metricPlot(fromZero(d.pppLatamRel), {width, yLabel: "variação da renda per capita desde 1990 (%)", yRules: [0], markRefs: true}))}

## Sete anos explicam metade do avanço

Entre 2003 e 2010, minerais, petróleo e alimentos ficaram muito mais caros, puxados pela demanda chinesa. Quem exportava commodities ganhou renda sem precisar mudar nada dentro de casa.

Esse período curto responde por ${d.fmtPct(boomShare)} de todo o crescimento da renda per capita do Brasil desde 1990.

<div class="takeaway">
  <strong>Mesmo no melhor momento, o Brasil aproveitou menos que os outros exportadores.</strong>
  <span>Entre 2003 e 2010, a renda per capita subiu ${d.fmtPct(d.waveBraBoom)} no Brasil, contra ${d.fmtPct(waveBoomMean)} na média dos outros sete exportadores. Só a ${d.waveBeatenBoom} cresceu menos.</span>
</div>

${resize((width) => barDelta(d.waveBoom, {width}))}

Quando o vento externo parou, a diferença ficou visível. Entre 2010 e ${lastYear}, a renda per capita subiu ${d.fmtPct(braPost)} no Brasil e ${d.fmtPct(wavePostMean)} na média dos outros exportadores.

<div class="takeaway">
  <strong>Em toda a série, o Brasil só ficou à frente da Rússia.</strong>
  <span>Entre 1990 e ${lastYear}, a renda per capita subiu ${d.fmtPct(d.waveBraRel - 100)} no Brasil e ${d.fmtPct(d.waveRusRel - 100)} na Rússia. Vários exportadores continuaram crescendo depois de 2010; o Brasil quase parou.</span>
</div>

${resize((width) => metricPlot(fromZero(d.pppWaveRel), {width, yLabel: "variação da renda per capita desde 1990 (%)", yRules: [0], rules: [2003, 2010], colorful: true}))}

O mesmo padrão aparece no grupo inteiro de ${pares("pares")}: depois de 2010, o Brasil cresceu ${d.fmtPct(braPost)} e a média dos pares cresceu ${d.fmtPct(clubPostMean)}. É a ${rankPost.pos}ª posição entre ${rankPost.n}.

## Depois de 2010, o motor parou

A produção por trabalhador mostra quanto a economia produz, em média, para cada pessoa ocupada. É o indicador que mais se aproxima do salário que um país pode pagar sem inflação.

Desde 1991, ela subiu ${d.fmtPct(d.braProdRel - 100)} no Brasil, ${d.fmtPct(d.polProdRel - 100)} na Polônia e ${d.fmtPct(d.korProdRel - 100)} na Coreia. O Brasil está em ${rankProd.pos}º entre ${rankProd.n}.

Quase todo o ganho brasileiro veio durante o boom. Entre 2010 e ${lastYear}, a produção por trabalhador subiu apenas ${d.fmtPct(braProdPost)} — em catorze anos.

${resize((width) => metricPlot(fromZero(d.prod90rel), {width, yLabel: "variação da produção por trabalhador desde 1991 (%)", yRules: [0], rules: [2003, 2010]}))}

Produzir mais por trabalhador não significa, sozinho, que a economia ficou mais eficiente. O aumento também pode vir de mais máquinas, mais infraestrutura ou mais horas trabalhadas.

A produtividade total dos fatores, ou TFP, tenta separar esses efeitos. Ela estima quanto a economia consegue produzir com a mesma quantidade de capital e de trabalho. É uma estimativa, com margem de erro grande, e serve para comparar tendências, não para medir um ano específico.

<div class="takeaway">
  <strong>A eficiência estimada do Brasil está abaixo do nível de 1990.</strong>
  <span>Desde 1990, a TFP caiu ${d.fmtPct(100 - d.braTfpRel)} no Brasil, a ${rankTfp.n - rankTfp.pos + 1}ª pior variação entre ${rankTfp.n} países. Polônia e Coreia ganharam ${d.fmtPct(d.polTfpRel - 100)} e ${d.fmtPct(d.korTfpRel - 100)}.</span>
</div>

${resize((width) => metricPlot(fromZero(d.tfp90rel), {width, yLabel: "variação da TFP desde 1990 (%)", yRules: [0]}))}

Aqui cabe uma ressalva importante. Ganhar eficiência foi difícil para quase todo o grupo: a média dos ${pares("pares")} subiu só ${d.fmtPct(d.clubTfp.value - 100)} em três décadas, e vários países também recuaram. O Brasil não é um caso isolado. Ele está entre os piores de um grupo que, no geral, avançou pouco.

O contraste continua válido: o trabalhador brasileiro produz mais que em 1991, mas a economia usa capital e trabalho com menos eficiência que em 1990.

## Por que o motor não pegou

Nenhum indicador isolado explica três décadas. Quatro deles, porém, apontam na mesma direção: pouco investimento, menos indústria, pouco comércio e regras que não melhoraram.

### Investimento baixo

Investimento é o que constrói máquinas, estradas, energia, redes e fábricas. Investir muito não garante crescimento. Investir pouco limita o que a economia consegue produzir depois.

Desde 1990, o Brasil investiu em média ${d.fmtPct(d.braInvMean)} do PIB por ano. A Polônia investiu ${d.fmtPct(d.polInvMean)} e a Coreia, ${d.fmtPct(d.korInvMean)}. Hoje o Brasil investe ${d.fmtPct(d.invBra?.value)}, a ${rankInv.pos}ª taxa entre ${rankInv.n} pares.

No gráfico abaixo, cada ponto é um país. A linha tracejada resume a tendência do grupo: quem investiu mais cresceu mais. A relação vale nos dois sentidos, porque crescimento também atrai investimento. Ela indica associação, não causa.

${resize((width) => invGrowthPlot(d.invGrowth, {width, trend: true, zero: true}))}

A Polônia mostra que investimento não explica tudo: investiu perto do Brasil e cresceu muito mais. A Coreia mostra o outro extremo: manteve investimento alto por décadas seguidas.

${resize((width) => metricPlot(d.inv, {width, yLabel: "investimento (% do PIB)"}))}

Todo investimento precisa ser financiado, por poupança interna ou externa. A poupança brasileira é baixa: ${d.fmtPct(d.braSav?.value)} do PIB, contra ${d.fmtPct(d.polSav?.value)} na Polônia e ${d.fmtPct(d.korSav?.value)} na Coreia.

${resize((width) => metricPlot(d.sav90, {width, yLabel: "poupança (% do PIB)"}))}

### Menos indústria

Em 1990, a indústria de transformação era ${d.fmtPct(d.mfgBra90)} do PIB brasileiro. Hoje é ${d.fmtPct(d.braMfg?.value)}.

Parte da queda é aritmética: quando commodities e serviços crescem, a fatia da indústria encolhe mesmo sem ela diminuir. E perder indústria não é ruim por definição — vários países ricos também perderam. O ponto é outro: a Coreia manteve a manufatura perto de um quarto da economia (${d.fmtPct(d.korMfg?.value)}) enquanto subia na escala tecnológica.

${resize((width) => metricPlot(d.mfg90, {width, yLabel: "indústria de transformação (% do PIB)"}))}

### Pouco comércio

Comércio exterior dá acesso a máquinas, tecnologia, concorrência e mercados maiores. Países grandes comerciam menos em relação ao PIB, porque vendem muito para si mesmos. Portanto, 100% não é meta para ninguém.

Ainda assim, o Brasil é fechado até perto de economias maiores que a dele. Exportações mais importações somam ${d.fmtPct(d.trdBra?.value)} do PIB brasileiro. Na China são ${d.fmtPct(trdChn)}, na Índia ${d.fmtPct(trdInd)}, no México ${d.fmtPct(d.trdMex?.value)} e na Polônia ${d.fmtPct(d.trdPol?.value)}.

${resize((width) => metricPlot(d.trd, {width, yLabel: "exportações + importações (% do PIB)"}))}

### Regras que não melhoraram

O indicador de qualidade regulatória do Banco Mundial resume avaliações de especialistas e instituições sobre a capacidade do governo de criar regras favoráveis à atividade econômica. É uma medida de percepção, com margem de erro, e não mede a qualidade do Estado como um todo.

No gráfico, cada país começa em zero em 1996. Acima de zero significa melhora desde então; abaixo, piora.

O Brasil recuou ${d.fmt2(-d.braRqRel)} ponto. A Polônia avançou ${d.fmt2(d.polRqRel)} e a Coreia, ${d.fmt2(d.korRqRel)}.

${resize((width) => metricPlot(d.rq90rel, {width, yLabel: "mudança desde 1996", format: (value) => value.toLocaleString("pt-BR", {maximumFractionDigits: 2, signDisplay: "exceptZero"}), yRules: [0]}))}

Nenhum desses quatro pontos prova uma causa isolada. Juntos, eles descrevem uma economia que recebeu um forte impulso de fora sem montar um motor interno equivalente ao dos ${pares("pares")} que abriram distância.

## Pobreza e fome: a melhora real

Esta é a parte boa, e ela é grande. A parcela da população com menos de US$ 8,30 por dia caiu de ${d.fmtPct(d.povBra95)} em 1995 para ${d.fmtPct(d.braPov?.value)} em ${d.braPov?.year}. São dezenas de milhões de pessoas.

A pergunta do relatório, porém, continua a mesma: essa queda foi maior que a dos outros?

As pesquisas domiciliares não acontecem nos mesmos anos em cada país. Por isso a comparação usa médias de três janelas: 2001–2005, 2008–2012 e 2020–2024. Dados anteriores a 1995 ficaram de fora.

Durante o boom, a pobreza caiu ${d.fmtGini(d.povertyBrazil.boom)} pontos percentuais no Brasil, ${d.fmtGini(d.povertyLatam.boom)} na América Latina sem o Brasil e ${d.fmtGini(d.povertyExporters.boom)} entre os exportadores sem o Brasil. Depois do boom, a queda brasileira foi de ${d.fmtGini(d.povertyBrazil.after)} pontos, contra ${d.fmtGini(d.povertyLatam.after)} e ${d.fmtGini(d.povertyExporters.after)}.

<div class="takeaway">
  <strong>A queda da pobreza no Brasil foi parecida com a dos grupos de comparação, nos dois períodos.</strong>
  <span>Na fase do boom, o Brasil ficou em ${povBoomRank.pos}º entre ${povBoomRank.n} países, logo acima do meio da tabela. Foi o melhor desempenho relativo do país fora da desigualdade, mas não o separou do grupo.</span>
</div>

Duas ressalvas honestas. Primeira: quem começa com mais pobreza tem mais espaço para cair, e o Brasil começou acima da maioria do grupo. Segunda: em 2020, o auxílio emergencial derrubou a pobreza medida, que voltou a subir em 2021. As médias de cinco anos suavizam esse efeito, mas não o eliminam.

Valores positivos na tabela indicam redução da pobreza, em pontos percentuais. Valores negativos indicam aumento.

```js
html`<div class="poverty-tables">
  ${povertyTableView(povertyGroups, "País ou grupo")}
  ${povertyTableView(povertyCountries, "País")}
</div>`
```

O nível de hoje ainda é alto. Um em cada cinco brasileiros vive com menos de US$ 8,30 por dia. É a ${rankPov.pos}ª maior taxa entre os ${rankPov.n} ${pares("pares")}, acima da média do grupo (${d.fmtPct(d.clubPovLast.value)}) e abaixo da média latino-americana (${d.fmtPct(d.latamPovLast.value)}).

${resize((width) => metricPlot(d.pov90, {width, yLabel: "população com menos de US$ 8,30/dia (%)", rules: [2003, 2010], markRefs: true}))}

A fome recuou ainda mais. A subnutrição caiu de ${d.fmtPct(d.hungerBra01)} da população em 2001 para ${d.fmtPct(d.braHunger?.value)}, que é o piso de medição da FAO — abaixo disso a agência não distingue valores. Tailândia e Turquia também tiveram quedas grandes. África do Sul e Equador terminaram acima do Brasil.

${resize((width) => metricPlot(d.hunger90, {width, yLabel: "população subnutrida (%)", yRules: [2.5]}))}

## Desigualdade: a exceção parcial

O índice de Gini mede como a renda se reparte. Zero seria renda igual para todos; 100 seria toda a renda com uma pessoa. Ele diz quem ficou com os ganhos, não se o país ficou rico ou pobre.

O Gini brasileiro caiu ${d.fmtGini(-d.braGiniRel)} pontos desde a primeira pesquisa, em 1990. É uma das maiores quedas do grupo; só o Chile reduziu mais (${d.fmtGini(-d.chlGiniRel)} pontos).

Aqui o Brasil realmente andou mais que a média. O problema é o ponto de partida. Com ${d.fmtGini(d.braGini?.value)}, o país ainda tem a ${rankGini.pos}ª maior desigualdade entre os ${rankGini.n} pares. Polônia está em ${d.fmtGini(d.polGini?.value)}, Coreia em ${d.fmtGini(d.korGini?.value)}, África do Sul em ${d.fmtGini(d.zafGini?.value)}.

${resize((width) => metricPlot(d.gini90, {width, yLabel: "desigualdade (Gini)", format: (value) => value.toLocaleString("pt-BR", {maximumFractionDigits: 1})}))}

## Educação: o Brasil subiu pouco e a OCDE caiu

O PISA testa alunos de 15 anos em matemática, leitura e ciências. É a comparação internacional mais usada para medir aprendizado.

No teste de 2022, o Brasil marcou ${d.fmtIdx(d.braPisa)} pontos em matemática. A média da OCDE foi ${d.fmtIdx(d.oecdPisa)}, a Polônia marcou ${d.fmtIdx(d.polPisa)} e a Coreia, ${d.fmtIdx(d.korPisa)}. Em leitura o Brasil ficou com ${d.fmtIdx(d.braPisaRead)} e em ciências, com ${d.fmtIdx(d.braPisaSci)}.

<div class="takeaway">
  <strong>A distância para a OCDE encolheu, mas mais pela queda dela que pela subida do Brasil.</strong>
  <span>Desde 2003, o Brasil ganhou ${d.fmtIdx(pisaBraGain)} pontos em matemática e a média da OCDE perdeu ${d.fmtIdx(pisaOecdDrop)}. A diferença caiu de ${d.fmtIdx(pisaGap03)} para ${d.fmtIdx(pisaGapNow)} pontos. Mais da metade dessa aproximação veio do outro lado.</span>
</div>

O avanço brasileiro também parou cedo. A nota subiu de ${d.fmtIdx(pisaBra03)} em 2003 para ${d.fmtIdx(pisaBra12)} em 2012 e não avançou desde então. É o retrato mais nítido da inércia em todo o relatório: o indicador melhorou, mas o ganho relativo veio do desempenho pior dos outros.

${resize((width) => metricPlot(d.pisa90, {width, yLabel: "PISA matemática", markRefs: true, format: d.fmtIdx}))}

### O Brasil gasta pouco ou gasta mal?

As duas coisas ao mesmo tempo, e é preciso separar.

Como fatia do PIB, o gasto brasileiro em educação é ${d.fmtPct(d.eduBra?.value)}, praticamente igual ao da Coreia (${d.fmtPct(d.eduKor?.value)}). Mas essa fatia não é gasto por aluno: o Brasil tem proporcionalmente mais crianças e jovens em idade escolar, então o mesmo percentual se divide entre mais gente.

Por aluno do ensino médio, o gasto público brasileiro foi ${d.fmtPct(d.pupilBra?.value)} da renda per capita em ${d.pupilBra?.year} — abaixo da Polônia, ${d.fmtPct(d.pupilPol?.value)} em ${d.pupilPol?.year}, e bem abaixo da Coreia, ${d.fmtPct(d.pupilKor?.value)} em ${d.pupilKor?.year}. Em dinheiro a distância é ainda maior, porque a renda per capita coreana é cerca de ${(korPppNow / braPppNow).toLocaleString("pt-BR", {maximumFractionDigits: 1})} vezes a brasileira. Essa série tem falhas e termina antes do PISA de 2022.

Ou seja: dizer que o Brasil “gasta muito e aprende pouco” é impreciso. O que os dados mostram é mais específico. Com esforço orçamentário parecido com o da Polônia, por aluno e como fatia do PIB, o Brasil fica ${d.fmtIdx(d.polPisa - d.braPisa)} pontos atrás dela em matemática.

Nos gráficos abaixo, cada ponto é um país. A linha tracejada é a média da OCDE.

${resize((width) => spendPisaPlot(d.spendPisa, {width, oecd: d.oecdPisa}))}

${resize((width) => spendPisaPlot(d.spendPisaPupil, {width, oecd: d.oecdPisa, xLabel: "% da renda per capita, por aluno", unit: "% renda per capita por aluno"}))}

## O que isso quer dizer

Contra o próprio passado, o Brasil melhorou em quase tudo. Contra quem partiu do mesmo lugar, quase sempre ficou para trás.

O padrão se repete indicador por indicador. Onde a melhora foi geral no mundo — menos fome, menos pobreza —, o Brasil melhorou junto, no ritmo dos outros. Onde a melhora exigia construir algo internamente — produtividade, eficiência, investimento, integração comercial, aprendizado —, o Brasil não construiu.

Entre esses dois blocos está o boom das commodities. Ele concentrou ${d.fmtPct(boomShare)} do ganho de renda per capita de três décadas em sete anos, e passou. Depois de 2010, a renda quase parou e a produção por trabalhador subiu ${d.fmtPct(braProdPost)} em catorze anos.

A desigualdade é a exceção parcial, e vale reconhecê-la: a queda do Gini foi das maiores do grupo. Mas o nível continua entre os mais altos, então o Brasil melhorou rápido em um indicador em que estava muito mal.

Os países que abriram distância não seguiram uma receita única. A Coreia poupou, investiu e subiu na escala industrial. A Polônia investiu quase como o Brasil, mas se integrou ao comércio e ganhou eficiência. Não há uma fórmula. Há uma diferença clara de resultado.

<div class="takeaway">
  <strong>O Brasil melhorou com o tempo. Quase nunca melhorou em relação aos ${pares("pares")}.</strong>
  <span>O avanço absoluto foi real. O avanço relativo foi raro, e a maior parte dele veio de fora.</span>
</div>

```js
html`<div class="score-wrap">
  <table class="score score-bars">
    <thead>
      <tr>
        <th></th>
        <th>Brasil</th>
        <th>Polônia</th>
        <th>Coreia</th>
        <th>África do Sul</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ["Renda per capita desde 1990", [d.bra90rel - 100, d.pol90rel - 100, d.kor90rel - 100, d.zaf90rel - 100], d.fmtPct],
        ["Prod. por trabalhador desde 1991", [d.braProdRel - 100, d.polProdRel - 100, d.korProdRel - 100, d.zafProdRel - 100], d.fmtPct],
        ["Eficiência (TFP) desde 1990", [d.braTfpRel - 100, d.polTfpRel - 100, d.korTfpRel - 100, d.zafTfpRel - 100], d.fmtPct],
        ["Investimento médio (% PIB)", [d.braInvMean, d.polInvMean, d.korInvMean, undefined], d.fmtPct],
        ["Indústria (% PIB)", [d.braMfg?.value, d.polMfg?.value, d.korMfg?.value, mfgZaf], d.fmtPct],
        ["Comércio (% PIB)", [d.trdBra?.value, d.trdPol?.value, trdKor, trdZaf], d.fmtPct],
        ["Pobreza a US$ 8,30/dia", [d.braPov?.value, d.polPov?.value, d.korPov?.value, d.zafPov?.value], d.fmtPct],
        ["Subnutrição", [d.braHunger?.value, hungerPol, hungerKor, d.zafHunger?.value], d.fmtPct],
        ["Desigualdade (Gini)", [d.braGini?.value, d.polGini?.value, d.korGini?.value, d.zafGini?.value], d.fmtGini],
        ["PISA matemática", [d.braPisa, d.polPisa, d.korPisa, undefined], d.fmtIdx],
      ].map(([metric, values, format]) => {
        const max = Math.max(0, ...values.filter((value) => value != null).map(Math.abs));
        return html`<tr>
          <th>${metric}</th>
          ${values.map((value, i) => barCell(format(value), value, max, i === 0 ? "bra" : "pos"))}
        </tr>`;
      })}
    </tbody>
  </table>
</div>`
```

## Limites deste relatório

- O grupo de comparação foi montado apenas pela renda de 1990. Ele ignora tamanho, geografia, população e instituições.
- Todas as médias de grupo são simples: um país, um voto.
- As pesquisas de pobreza e desigualdade ocorrem em anos diferentes em cada país. As comparações usam o dado mais recente de cada um, ou médias de janelas de cinco anos.
- TFP é uma estimativa com margem de erro. Qualidade regulatória é uma medida de percepção. Nenhuma das duas deve ser lida ao pé da letra em um ano isolado.
- Nada aqui identifica causas nem avalia governos. O relatório compara resultados entre países.

Fontes: World Bank WDI e WGI · Penn World Table 11 via Our World in Data · FAO · OECD PISA 2022. PPP ajusta as diferenças de preços entre países. As séries sociais seguem os anos disponíveis de cada pesquisa.
