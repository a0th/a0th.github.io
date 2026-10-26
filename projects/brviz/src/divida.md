---
toc:
  label: Nesta página
---

# Dívida, previdência e salário mínimo

Esta página acompanha o [relatório](./). Ela junta duas coisas: a trajetória da dívida pública brasileira, com o mesmo grupo de pares, e o debate sobre desvincular do salário mínimo o BPC e o piso das aposentadorias, com o que o FMI e o Banco Mundial recomendam e por quê.

```js
import { load, series, at, last, keep, NAMES } from "./components/data.js";
import { metricPlot, barDelta } from "./components/plots.js";

const wdi = await FileAttachment("./data/wdi.csv").csv({ typed: true });
const pisa = await FileAttachment("./data/pisa.csv").csv({ typed: true });
const d = load(wdi, pisa);

const debt = series("gg_debt", wdi);
const primary = series("gg_primary", wdi);
const balance = series("gg_balance", wdi);
const rev = series("gg_rev", wdi);
const exp = series("gg_exp", wdi);

const club = d.club90.filter((iso) => !["UMC", "LCN"].includes(iso));
const debtClub = keep(debt, club);

const interestOf = (iso, year) => {
  const p = at(primary, iso, year);
  const b = at(balance, iso, year);
  return p == null || b == null ? undefined : p - b;
};

const year = last(debt, "BRA")?.year;
const braDebt = at(debt, "BRA", year);
const braPrimary = at(primary, "BRA", year);
const braInterest = interestOf("BRA", year);
const braRev = at(rev, "BRA", year);
const braExp = at(exp, "BRA", year);

const firstYear = d3.min(primary.filter((r) => r.iso === "BRA"), (r) => r.year);
const braYears = d3.range(firstYear, year + 1);
const fiscalRows = braYears.flatMap((y) => {
  const p = at(primary, "BRA", y);
  const i = interestOf("BRA", y);
  if (p == null || i == null) return [];
  return [
    { year: y, kind: "Déficit primário", value: -p },
    { year: y, kind: "Juros", value: i },
  ];
});
const nominalRows = braYears
  .map((y) => ({ year: y, value: -at(balance, "BRA", y) }))
  .filter((r) => Number.isFinite(r.value));

const mean = (xs) => {
  const v = xs.filter(Number.isFinite);
  return v.length ? d3.mean(v) : undefined;
};
const braInterestMean = mean(braYears.map((y) => interestOf("BRA", y)));
const braPrimaryMean = (y0, y1) => mean(d3.range(y0, y1 + 1).map((y) => at(primary, "BRA", y)));

const latestPoint = (rows, iso) => {
  const row = last(rows, iso);
  return row && row.year >= year - 1 ? row : undefined;
};

function peerBars(valueOf) {
  return club
    .map((iso) => {
      const value = valueOf(iso);
      if (!Number.isFinite(value)) return;
      return { iso, name: NAMES[iso] ?? iso, value, tone: iso === "BRA" ? "bra" : "peer" };
    })
    .filter((row) => row);
}

const debtBars = peerBars((iso) => latestPoint(debt, iso)?.value);
const interestBars = peerBars((iso) => interestOf(iso, year));
const revBars = peerBars((iso) => latestPoint(rev, iso)?.value);

function rankOf(rows, iso) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return { pos: sorted.findIndex((row) => row.iso === iso) + 1, n: sorted.length };
}

const rankDebt = rankOf(debtBars, "BRA");
const rankInterest = rankOf(interestBars, "BRA");
const rankRev = rankOf(revBars, "BRA");
const nth = ({ pos }, noun) => (pos === 1 ? `a maior ${noun}` : `a ${pos}ª maior ${noun}`);
const peerMean = (rows) => mean(rows.filter((r) => r.iso !== "BRA").map((r) => r.value));

const debt13 = at(debt, "BRA", 2013);
const debt20 = at(debt, "BRA", 2020);
const fmtPp = (x) => (x == null ? "—" : `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const fmtSigned = (x) =>
  x == null ? "—" : `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" })}%`;

function lede(kicker, title, value, neg = false) {
  return html`<div class="lede">
    <div class="lede-kicker">${kicker}</div>
    <div class="lede-title">${title}</div>
    <div class="lede-big ${neg ? "neg" : ""}">${value}</div>
  </div>`;
}

function fiscalPlot(width) {
  const bra = getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
  return Plot.plot({
    width,
    height: Math.round(Math.max(260, Math.min(380, width * 0.7))),
    marginLeft: 48,
    x: { label: null, tickFormat: "d", interval: 1 },
    y: { label: "% do PIB", grid: true },
    color: { legend: true, domain: ["Déficit primário", "Juros", "Déficit nominal"], range: [bra, "#b45309", "currentColor"] },
    marks: [
      Plot.barY(fiscalRows, { x: "year", y: "value", fill: "kind", fillOpacity: 0.8, tip: { format: { y: (v) => fmtPp(v) } } }),
      Plot.ruleY([0]),
      Plot.lineY(nominalRows, { x: "year", y: "value", stroke: "currentColor", strokeWidth: 1.5 }),
      Plot.dot(nominalRows, { x: "year", y: "value", fill: "currentColor", r: 2.5 }),
    ],
  });
}
```

```js
html`<div class="lede-grid">
  ${lede("Dívida bruta do governo geral", `% do PIB · ${year}`, fmtPp(braDebt), true)}
  ${lede("Juros", `% do PIB · ${year}`, fmtPp(braInterest), true)}
  ${lede("Resultado primário", `% do PIB · ${year}`, fmtSigned(braPrimary), braPrimary < 0)}
</div>`
```

## A dívida: alta para o grupo

Em ${year}, a dívida bruta do governo geral brasileiro era ${fmtPp(braDebt)} do PIB, pelo critério do FMI. É ${nth(rankDebt, "")}entre ${rankDebt.n} pares com dado. A média simples dos demais é ${fmtPp(peerMean(debtBars))}.

A trajetória tem duas fases. Até 2013 a dívida caiu devagar, de ${fmtPp(at(debt, "BRA", 2002))} em 2002 para ${fmtPp(debt13)} em 2013, o ponto mais baixo da série. Entre 2013 e 2020 subiu ${d.fmtGini(debt20 - debt13)} pontos do PIB, para ${fmtPp(debt20)}. Desde então oscila acima de 80%.

${resize((width) => metricPlot(debtClub, {width, yLabel: "dívida bruta do governo geral (% do PIB)", rules: [2013]}))}

${resize((width) => barDelta(debtBars, {width, xLabel: `dívida bruta (% do PIB, ${year} ou ano anterior)`, format: fmtPp}))}

<div class="takeaway">
  <strong>Este número é maior que o do noticiário brasileiro.</strong>
  <span>O FMI conta na dívida bruta os títulos do Tesouro na carteira do Banco Central. O Banco Central do Brasil, na medida oficial (DBGG), não conta a maior parte deles. A comparação entre países só funciona com uma definição única, e a usada aqui é a do FMI.</span>
</div>

## Por que a dívida sobe: juros e déficit primário

A dívida cresce quando o governo gasta mais do que arrecada. Essa diferença tem duas partes. O resultado primário é receita menos despesa, sem contar juros. Os juros são o custo da dívida que já existe.

No Brasil, os juros dominam. De ${firstYear} a ${year}, eles custaram em média ${fmtPp(braInterestMean)} do PIB por ano. O resultado primário foi superavitário em média ${fmtPp(braPrimaryMean(2001, 2013))} entre 2001 e 2013, deficitário em média ${fmtPp(-braPrimaryMean(2014, 2019))} entre 2014 e 2019, e oscilou perto de zero depois da pandemia.

${resize((width) => fiscalPlot(width))}

As barras empilham o déficit primário (azul; abaixo de zero é superávit) e os juros (laranja). A linha é o déficit nominal, a soma dos dois.

Em ${year}, o Brasil gastou ${fmtPp(braInterest)} do PIB com juros, ${nth(rankInterest, "conta")} entre ${rankInterest.n} pares. A média dos demais foi ${fmtPp(peerMean(interestBars))}.

${resize((width) => barDelta(interestBars, {width, xLabel: `juros (% do PIB, ${year})`, format: fmtPp}))}

<div class="takeaway">
  <strong>Um superávit primário pequeno não basta com juros desse tamanho.</strong>
  <span>Com o primário em ${fmtSigned(braPrimary)} e juros de ${fmtPp(braInterest)} do PIB em ${year}, o déficit nominal foi ${fmtPp(-at(balance, "BRA", year))}. O Banco Mundial calcula que estabilizar a dívida perto do nível atual exige superávit primário de 2% a 3% do PIB, um ajuste de cerca de 3% do PIB em relação a 2024.</span>
</div>

Os juros altos não são só herança da dívida grande. A taxa real de juros brasileira está entre as mais altas do mundo, e ela depende da política monetária, da inflação e da confiança na trajetória fiscal. Essa é a crítica mais comum às recomendações abaixo: elas tratam do gasto primário e falam pouco do custo dos juros. As duas coisas se ligam. O FMI argumenta que um esforço fiscal crível ajuda a reduzir a inflação esperada e, com ela, os juros.

## Receita alta, despesa mais alta

O Brasil arrecada muito para o seu nível de renda. Em ${year}, a receita do governo geral foi ${fmtPp(braRev)} do PIB, ${nth(rankRev, "")}entre ${rankRev.n} pares (média dos demais: ${fmtPp(peerMean(revBars))}). A despesa foi ${fmtPp(braExp)}.

${resize((width) => barDelta(revBars, {width, xLabel: `receita do governo geral (% do PIB, ${year} ou ano anterior)`, format: fmtPp}))}

É por isso que os dois organismos põem a maior parte do ajuste do lado da despesa. O Banco Mundial escreve que, dada a carga tributária alta e as alíquotas altas sobre consumo e trabalho, a maior parte do ajuste deverá vir do gasto. As reformas tributárias, no texto dele, servem para tornar o sistema mais eficiente e justo, não para arrecadar mais.

## Onde entra o salário mínimo

A Constituição amarra dois benefícios ao salário mínimo. O artigo 201 diz que nenhum benefício que substitua o salário do segurado pode ser menor que o mínimo. O artigo 203 garante um salário mínimo por mês ao idoso e à pessoa com deficiência que não consigam se manter, o Benefício de Prestação Continuada (BPC).

Na prática, quando o salário mínimo sobe, sobem junto o piso do INSS, o BPC, o abono salarial e o seguro-desemprego. Os números do Banco Mundial, para 2024:

- Cerca de 40% dos pagamentos de aposentadorias urbanas estão no piso.
- Todas as aposentadorias rurais (1,6% do PIB) e todo o BPC (0,9% do PIB) seguem o mínimo.
- Abono salarial (0,2% do PIB) e seguro-desemprego (0,4% do PIB) também.
- Cada R$ 1 a mais no salário mínimo eleva o gasto federal com esses programas em R$ 421 milhões. Um aumento de R$ 50, 3,2% do valor de 2025, abre 0,2% do PIB de despesa.

Desde 2025, o ganho real do salário mínimo está limitado a 2,5% ao ano, o mesmo teto da regra de gastos. Isso freia o crescimento desses benefícios em anos de PIB forte, mas não os desvincula. Um aumento de 2,5% ainda custa cerca de 0,15% do PIB por ano, antes do efeito do envelhecimento sobre o número de beneficiários.

## O que o FMI recomenda

No Artigo IV de 2025, o FMI chama o teto de 2,5% de “um passo na direção certa”, e propõe ir além. A lista de opções para dar flexibilidade ao orçamento inclui:

- desvincular o crescimento das aposentadorias e dos benefícios assistenciais do crescimento do salário mínimo, revisando o dispositivo constitucional;
- conter ainda mais o ganho real do salário mínimo;
- pôr um teto no crescimento do gasto previdenciário;
- rever os pisos constitucionais de saúde e educação, alinhando o crescimento deles ao da regra de gastos.

O FMI estima que essas medidas de gasto, juntas, melhorariam o resultado primário em 1% a 2% do PIB no médio prazo.

**A justificativa é a rigidez.** Cerca de 90% da despesa primária federal é obrigatória. O gasto previdenciário cresce mais rápido que a receita porque o benefício por pessoa segue o salário mínimo, que tende a crescer perto do PIB nominal, e porque há cada vez mais beneficiários. Como a regra fiscal limita o gasto total a 70% do crescimento real da receita, o que cresce por indexação espreme o resto. O orçamento de 2026 projeta a despesa discricionária caindo em direção a zero.

Na previdência, o FMI reconhece que a reforma de 2019 estabilizou o déficit até cerca de 2030 e sugere passos adicionais: taxa de reposição menor, contribuição mais alta, fim da isenção parcial de Imposto de Renda para aposentados acima de 65 anos, idade efetiva de aposentadoria mais alta e coordenação dos benefícios não contributivos com os outros programas, para evitar pagamento duplicado. A ressalva explícita é proteger a assistência focalizada.

A recomendação não é nova. O Artigo IV de 2014 já pedia rever a indexação de benefícios ao mínimo. O de 2018 pedia desvincular a aposentadoria mínima do salário mínimo como parte de uma reforma previdenciária ampla.

## O que o Banco Mundial recomenda

O relatório *Dois por Um* (junho de 2025) é mais específico. Ele propõe desvincular do salário mínimo o piso previdenciário e as aposentadorias assistenciais, e calcular a aposentadoria contributiva em proporção aos anos de contribuição. Para o BPC, propõe um valor abaixo do das aposentadorias contributivas, e a fusão do BPC com a aposentadoria rural, para simplificar e garantir uma proteção mínima universal na velhice.

As estimativas do próprio relatório:

- Desvincular só os benefícios mínimos (urbanos, rurais e BPC) economizaria cerca de R$ 19 bilhões (0,1% do PIB) no primeiro ano, chegando a 0,6% do PIB no quinto.
- O pacote completo, com o BPC abaixo do benefício contributivo, poderia cortar até 30% do gasto atual com benefícios mínimos — 0,9% do PIB — quando estiver totalmente em vigor.

**A justificativa fiscal é a mesma do FMI**, com três argumentos explícitos: a indexação automática é procíclica, porque o gasto sobe junto com o PIB nos anos bons; é incompatível com uma regra em que o gasto precisa crescer menos que a receita; e cria rigidez, porque o governo não consegue mudar prioridades. O relatório acrescenta que o salário mínimo deveria ser política de mercado de trabalho e virou parâmetro de orçamento.

**O argumento que só o Banco Mundial faz é o de incentivo e equidade:**

- Cerca de dois terços dos aposentados se aposentam no piso.
- Só 9% dos aposentados urbanos no piso contribuíram mais de 25 anos.
- No piso, quem contribuiu pouco tem retorno real de 12% sobre as contribuições. Quem contribuiu mais de 25 anos tem retorno de 0%.
- O BPC, que não exige contribuição, paga o mesmo que a aposentadoria mínima. Contribuir a mais quase não muda o benefício, e muita gente para de contribuir ao chegar aos 15 anos exigidos.
- O piso põe o aposentado entre o 5º e o 6º décimo da distribuição de renda, não entre os mais pobres.
- RGPS e BPC pagam 32 milhões de benefícios, para 20,7 milhões de brasileiros com 65 anos ou mais, e 11% dos beneficiários recebem mais de um benefício do governo.

Em 2022, um artigo do Banco Mundial fez a pergunta de forma direta: o idoso que nunca contribuiu deve receber o dobro do que recebe uma família jovem vulnerável no Bolsa Família?

## O que a desvinculação não diz

- **Desvincular não é cortar em termos reais.** A proposta do FMI é parar de repassar ao benefício o ganho real do salário mínimo. A do Banco Mundial vai além no BPC, que ficaria abaixo da aposentadoria contributiva. O efeito sobre a pobreza na velhice depende do índice que substitui o mínimo e de quem a regra atinge.
- **Quem já recebe é a questão política.** O Banco Mundial reconhece, para as aposentadorias militares, que mudanças em benefícios já concedidos só se viabilizam para coortes futuras. Essa ressalva não aparece escrita do mesmo jeito para o BPC.
- **A economia é pequena perto dos juros.** Desvincular só os mínimos economiza 0,6% do PIB depois de cinco anos. Os juros custaram ${fmtPp(braInterest)} do PIB em ${year}. Os dois organismos tratam a desvinculação como uma peça de um ajuste maior, não como solução isolada.
- **Há críticas.** Quem se opõe aponta que o BPC e o piso tiraram milhões de idosos da pobreza, que o Chile viu protestos grandes contra pensões baixas em 2019, e que as recomendações falam pouco da conta de juros. O próprio relatório do Banco Mundial propõe, no mesmo pacote, tributar mais a renda alta e rever aposentadorias militares, que não dependem do salário mínimo.

## Limites desta página

- A dívida, a receita, a despesa e os resultados vêm do FMI (WEO e Fiscal Monitor), governo geral. A dívida bruta do FMI é maior que a DBGG oficial do Banco Central do Brasil.
- Os juros são calculados como resultado primário menos resultado nominal. É o custo líquido de juros, não o pagamento bruto.
- Os números sobre benefícios ligados ao salário mínimo e as economias estimadas são do Banco Mundial e do FMI, não dos dados deste site.
- Nada aqui mede o efeito de uma desvinculação sobre a pobreza.

Fontes: IMF World Economic Outlook e Fiscal Monitor (`GGXWDG_NGDP`, `GGXONLB_G01_GDP_PT`, `GGXCNL_NGDP`, `GGR_G01_GDP_PT`, `G_X_G01_GDP_PT`) · FMI, [Brazil: 2025 Article IV Consultation](https://www.imf.org/-/media/files/publications/cr/2025/english/1braea2025001-source-pdf.pdf) (Country Report 25/194), e Artigos IV de [2014](https://www.imf.org/external/pubs/ft/scr/2015/cr15121.pdf) e [2018](https://www.elibrary.imf.org/view/journals/002/2018/253/article-A001-en.xml) · Banco Mundial, [*Dois por Um: Políticas para Atingir Sustentabilidade Fiscal e Ambiental*](https://documents.worldbank.org/pt/publication/documents-reports/documentdetail/099060925140039633) (2025) · Banco Mundial, *A agenda da reforma previdenciária brasileira ainda não foi concluída* (2022) · Constituição Federal, arts. 201, § 2º, e 203, V.
