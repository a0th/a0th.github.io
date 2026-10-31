---
toc:
  label: Nesta página
---

# Diagrama de Nolan: políticos brasileiros

```js
const nolan = await FileAttachment("./data/nolan.json").json();

const PONTOS = {concordo: 1, em_parte: 0, discordo: -1};
const MAX_SALDO = 16;
const RESPOSTA = {concordo: "Concorda", em_parte: "Em parte", discordo: "Discorda", sem_registro: "Sem registro"};
const TIPO = {voto: "Voto", ato: "Ato ou projeto", declaracao: "Declaração", programa: "Programa de campanha"};
const EIXO = {economico: "Econômico", pessoal: "Pessoal"};

const itens = new Map(nolan.itens.map((d) => [d.id, d]));

function nota(item, r) {
  const v = PONTOS[r.resposta];
  if (v === undefined) return null;
  return v * (r.intensidade === "forte" ? 2 : 1) * (item.sentido === "liberdade" ? 1 : -1);
}

const linhas = nolan.figuras.flatMap((f) =>
  f.respostas.map((r) => {
    const item = itens.get(r.item);
    return {...r, figura: f.curto, eixo: item.eixo, texto: item.texto, nota: nota(item, r)};
  })
);

const placar = nolan.figuras.map((f) => {
  const eixo = (e) => {
    const v = linhas.filter((l) => l.figura === f.curto && l.eixo === e && l.nota !== null);
    return {nota: d3.sum(v, (d) => d.nota), n: v.length};
  };
  const ec = eixo("economico");
  const pe = eixo("pessoal");
  return {curto: f.curto, economico: ec.nota, n_economico: ec.n, pessoal: pe.nota, n_pessoal: pe.n};
});

const P = new Map(placar.map((d) => [d.curto, d]));
const fmt = (x) => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : "0");

const refs = [];
const refDe = new Map();
const refPorUrl = new Map();
for (const f of nolan.figuras) {
  for (const r of f.respostas) {
    if (!r.url) continue;
    if (!refPorUrl.has(r.url)) {
      refs.push({...r, usos: []});
      refPorUrl.set(r.url, refs.length);
    }
    const n = refPorUrl.get(r.url);
    refs[n - 1].usos.push(`${f.curto}, ${r.item}`);
    refDe.set(`${f.curto}|${r.item}`, n);
  }
}
```

O Diagrama de Nolan troca a linha única entre esquerda e direita por dois eixos: quanta liberdade a pessoa quer na **economia** (empresas, preços, impostos) e quanta quer na **vida pessoal** (armas, drogas, costumes, expressão). Quem quer muita nas duas fica no canto libertário; quem quer pouca nas duas, no canto estatista.

A versão popular do diagrama vem de um questionário curto criado por um grupo libertário americano. Esta página usa um questionário próprio, com temas do debate brasileiro, e responde por cada político com base no que ele votou, fez no governo ou disse em público. Cada resposta tem fonte, e qualquer pessoa pode conferir.

Esta é uma **versão parcial**, com ${nolan.figuras.length} políticos. A lista ainda está sendo completada.

## O questionário

São oito afirmações por eixo. Metade foi escrita a favor de mais liberdade e metade a favor de mais Estado, para que concordar com tudo não empurre ninguém para o mesmo lado.

```js
html`<table class="nolan-itens">
  <thead><tr><th></th><th>Afirmação</th><th>Concordar significa</th></tr></thead>
  <tbody>${nolan.itens.map((d) => html`<tr>
    <td class="nolan-id">${d.id}</td>
    <td>${d.texto}</td>
    <td class=${d.sentido === "liberdade" ? "nolan-lib" : "nolan-est"}>${d.sentido === "liberdade" ? "mais liberdade" : "mais Estado"}</td>
  </tr>`)}</tbody>
</table>`
```

**Como cada resposta é decidida.** Vale primeiro o voto nominal no Congresso, depois o ato de governo (decreto, sanção, projeto enviado), em seguida a declaração pública explícita e, por último, o programa de campanha registrado. Quando a pessoa mudou de posição, vale a mais recente, e a anterior fica registrada na ficha. "Em parte" só é usado quando a posição registrada é condicional ou quando há registros em direções opostas sem uma posição recente clara. Sem registro público claro, a resposta fica em branco: não deduzimos a opinião de alguém pelo partido.

**Como a nota é calculada.** Cada resposta soma ou tira pontos de liberdade. A favor de mais liberdade vale +1 ou +2, a favor de mais Estado vale −1 ou −2, e "em parte" ou sem registro vale 0. Nos itens escritos a favor de mais Estado, concordar tira pontos. A nota de cada eixo é a soma das oito respostas e vai de −16 a +16, com o 0 no meio. Assim, uma nota perto de 0 só aparece quando as respostas se anulam ou quando há poucas com registro, e o número de respostas com registro aparece ao lado de cada nota.

**Quando a resposta vale 2.** A resposta vale ±2 em dois casos. O primeiro é quando a pessoa liderou a medida: assinou o decreto ou a lei, executou a política como governante ou é autora do projeto. O segundo é quando ela defende a versão geral ou máxima da afirmação, como reverter todas as privatizações, proibir qualquer moderação nas redes ou criminalizar a posse de drogas em qualquer quantidade. Votar a favor do projeto de outra pessoa, assinar uma PEC com dezenas de autores, defender uma versão limitada (porte de arma só no campo, crédito de emergência após uma enchente) ou declarar apoio genérico vale ±1. Pela regra, ${linhas.filter((d) => Math.abs(d.nota) === 2).length} das ${linhas.filter((d) => d.nota !== null && d.nota !== 0).length} respostas que concordam ou discordam valem 2.

## O diagrama

```js
function diagrama(width) {
  const quadrantes = [
    {x: 12, y: 14.7, t: "Libertário"},
    {x: -12, y: 14.7, t: "Esquerda"},
    {x: 12, y: -14.7, t: "Direita"},
    {x: -12, y: -14.7, t: "Estatista"}
  ];
  const S = Math.min(width, 560);
  const M = {top: 20, right: 20, bottom: 44, left: 48};
  const iw = S - M.left - M.right, ih = S - M.top - M.bottom;
  const px = (x) => M.left + ((x + MAX_SALDO) / (2 * MAX_SALDO)) * iw;
  const py = (y) => M.top + (1 - (y + MAX_SALDO) / (2 * MAX_SALDO)) * ih;
  const caixas = [
    ...placar.map((d) => ({x0: px(d.economico) - 8, x1: px(d.economico) + 8, y0: py(d.pessoal) - 8, y1: py(d.pessoal) + 8})),
    ...quadrantes.map((q) => ({x0: px(q.x) - q.t.length * 4, x1: px(q.x) + q.t.length * 4, y0: py(q.y) - 8, y1: py(q.y) + 8}))
  ];
  const colide = (b) => caixas.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const posicoes = [["start", 10, -13], ["end", -10, -13], ["start", 10, 15], ["end", -10, 15], ["start", 12, 0], ["end", -12, 0]];
  const rotulos = [...placar].sort((a, b) => b.pessoal - a.pessoal).map((d) => {
    const w = d.curto.length * 7 + 4;
    const cx = px(d.economico), cy = py(d.pessoal);
    const caixa = ([anchor, dx, dy]) => {
      const x = cx + dx;
      return {x0: anchor === "start" ? x : x - w, x1: anchor === "start" ? x + w : x, y0: cy + dy - 7, y1: cy + dy + 7};
    };
    const dentro = (b) => b.x0 >= M.left && b.x1 <= S - M.right && b.y0 >= M.top && b.y1 <= S - M.bottom;
    const p = posicoes.find((p) => !colide(caixa(p)) && dentro(caixa(p))) ?? posicoes.find((p) => !colide(caixa(p))) ?? posicoes[0];
    caixas.push(caixa(p));
    return {
      curto: d.curto,
      anchor: p[0],
      x: ((cx + p[1] - M.left) / iw) * 2 * MAX_SALDO - MAX_SALDO,
      y: (1 - (cy + p[2] - M.top) / ih) * 2 * MAX_SALDO - MAX_SALDO
    };
  });
  return Plot.plot({
    width: S,
    height: S,
    marginTop: M.top,
    marginRight: M.right,
    marginLeft: M.left,
    marginBottom: M.bottom,
    x: {domain: [-MAX_SALDO, MAX_SALDO], label: "Liberdade econômica →", ticks: [-16, -8, 0, 8, 16], tickFormat: fmt},
    y: {domain: [-MAX_SALDO, MAX_SALDO], label: "↑ Liberdade pessoal", ticks: [-16, -8, 0, 8, 16], tickFormat: fmt},
    marks: [
      Plot.frame({stroke: "currentColor", strokeOpacity: 0.2}),
      Plot.ruleX([0], {strokeOpacity: 0.25, strokeDasharray: "4,4"}),
      Plot.ruleY([0], {strokeOpacity: 0.25, strokeDasharray: "4,4"}),
      Plot.text(quadrantes, {x: "x", y: "y", text: "t", fill: "currentColor", fillOpacity: 0.4, fontSize: 12, fontWeight: 600}),
      Plot.dot(placar, {x: "economico", y: "pessoal", r: 7, fill: (d) => (Math.min(d.n_economico, d.n_pessoal) < 6 ? "white" : "var(--bra)"), stroke: "var(--bra)", strokeWidth: 2}),
      ...["start", "end"].map((textAnchor) =>
        Plot.text(rotulos.filter((d) => d.anchor === textAnchor), {
          x: "x",
          y: "y",
          text: "curto",
          textAnchor,
          fontSize: 12,
          fontWeight: 600
        })
      ),
      Plot.tip(placar, Plot.pointer({
        x: "economico",
        y: "pessoal",
        title: (d) => `${d.curto}\nEconômico: ${fmt(d.economico)} (${d.n_economico} de 8 itens com registro)\nPessoal: ${fmt(d.pessoal)} (${d.n_pessoal} de 8 itens com registro)`
      }))
    ]
  });
}
```

<div class="card">${resize((width) => diagrama(width))}</div>

Pontos vazados têm registro em menos de 6 das 8 afirmações de algum eixo, e a nota deles é menos confiável.

No eixo econômico, os políticos se espalham dos dois lados: Lula e Jones Manoel ficam em ${fmt(P.get("Lula").economico)} e ${fmt(P.get("Jones Manoel").economico)}, Zema em ${fmt(P.get("Zema").economico)}, e Kim Kataguiri e Bolsonaro em ${fmt(P.get("Kim Kataguiri").economico)} e ${fmt(P.get("Bolsonaro").economico)}. No eixo pessoal, todos ficam perto do meio: o mais alto é Kim, com ${fmt(P.get("Kim Kataguiri").pessoal)}, e o mais baixo é Nikolas Ferreira, com ${fmt(P.get("Nikolas Ferreira").pessoal)}. Lula (${fmt(P.get("Lula").pessoal)}) fica mais embaixo que Bolsonaro (${fmt(P.get("Bolsonaro").pessoal)}) e Tarcísio (${fmt(P.get("Tarcísio").pessoal)}). O mapa abaixo mostra por quê.

## Item por item

```js
function mapa(width) {
  const ordem = nolan.itens.map((d) => d.id);
  const comRegistro = linhas.filter((d) => d.nota !== null);
  const semRegistro = linhas.filter((d) => d.nota === null);
  return Plot.plot({
    width: Math.max(width, 640),
    height: 60 + 44 * nolan.figuras.length,
    marginLeft: 100,
    marginTop: 34,
    x: {domain: ordem, axis: "top", label: null, tickSize: 0},
    y: {domain: nolan.figuras.map((f) => f.curto), label: null, tickSize: 0},
    color: {type: "linear", domain: [-2, 0, 2], range: ["#b45309", "#f1f1ef", "#1e3a8a"], interpolate: "rgb"},
    marks: [
      Plot.cell(comRegistro, {x: "item", y: "figura", fill: "nota", inset: 1.5, rx: 3}),
      Plot.cell(semRegistro, {x: "item", y: "figura", fill: "none", stroke: "currentColor", strokeOpacity: 0.2, strokeDasharray: "3,3", inset: 3, rx: 3}),
      Plot.text(comRegistro, {x: "item", y: "figura", text: (d) => fmt(d.nota), fill: (d) => (Math.abs(d.nota) === 2 ? "white" : "#333"), fontSize: 11, fontWeight: 600}),
      Plot.text(semRegistro, {x: "item", y: "figura", text: () => "—", fillOpacity: 0.5}),
      Plot.tip(linhas, Plot.pointer({
        x: "item",
        y: "figura",
        title: (d) => `${d.figura} · ${d.item}\n${d.texto}\n${RESPOSTA[d.resposta]}${d.nota === null ? "" : ` → ${fmt(d.nota)}`}`
      }))
    ]
  });
}
```

<div class="card" style="overflow-x:auto">${resize((width) => mapa(width))}</div>

Azul é mais liberdade e laranja é mais Estado. A cor forte indica resposta que vale 2, e o tracejado indica que não há registro. As oito primeiras colunas são o eixo econômico; as oito últimas, o pessoal.

No eixo econômico, a maioria fica quase toda de uma cor; Ciro Gomes, Haddad e Marina Silva misturam, com muitas respostas "em parte". No pessoal, o padrão é outro. Bolsonaro, Nikolas Ferreira, Tarcísio, Zema e Ratinho Jr. marcam liberdade em armas, educação em casa e redes sociais, e Estado em drogas, aborto e cassinos. Lula, Erika Hilton, Jones Manoel e Ciro Gomes fazem quase o inverso. Nos dois grupos, as respostas se anulam e o saldo fica perto de 0, mas as posições são opostas.

<div class="finding piloto">

**O saldo do eixo pessoal esconde duas direções.** O eixo econômico separa bem os políticos. O pessoal junta temas que não andam juntos no Brasil: quem defende armas e liberdade nas redes é contra descriminalizar a maconha e o aborto, e vice-versa. Kim Kataguiri é o único que fica alto nos dois eixos, perto do canto libertário. Marina Silva é o caso oposto: fica do lado do Estado nas duas direções, contra armas e também contra liberar drogas e aborto.

</div>

<div class="caveat">

**${nolan.figuras.length} políticos ainda não testam o diagrama.** Com poucos pontos, um padrão pode ser coincidência. A pergunta que interessa, se esses dois eixos descrevem bem a política brasileira, só pode ser respondida com a lista completa.

</div>

## As fichas

Cada linha mostra a resposta, a evidência usada e a fonte. O número entre colchetes leva à lista de referências no fim da página.

```js
function ficha(f) {
  const rs = linhas.filter((l) => l.figura === f.curto);
  const p = P.get(f.curto);
  return html`<section class="nolan-ficha">
    <h3>${f.nome}</h3>
    <p class="nolan-papel">${f.papel} · econômico ${fmt(p.economico)} (${p.n_economico} de 8) · pessoal ${fmt(p.pessoal)} (${p.n_pessoal} de 8)</p>
    <table>
      <thead><tr><th>Item</th><th>Resposta</th><th>Evidência</th></tr></thead>
      <tbody>${rs.map((r) => {
        const n = refDe.get(`${f.curto}|${r.item}`);
        return html`<tr>
          <td class="nolan-id" title=${r.texto}>${r.item}<div class="nolan-item-texto">${r.texto}</div></td>
          <td><span class=${`nolan-resp ${r.resposta}`}>${RESPOSTA[r.resposta]}</span>${r.nota === null ? "" : html`<div class="nolan-pontos">${fmt(r.nota)}${r.intensidade === "forte" ? " (forte)" : ""}</div>`}${r.confianca === "baixa" ? html`<div class="nolan-pontos">evidência fraca</div>` : ""}</td>
          <td>
            ${r.tipo ? html`<span class="nolan-tipo">${TIPO[r.tipo]}${r.data ? `, ${r.data}` : ""}</span> ` : ""}${r.resumo}
            ${r.citacao ? html`<div class="nolan-citacao">“${r.citacao}”</div>` : ""}
            ${n ? html` <a href=${`#ref-${n}`}>[${n}]</a>` : ""}
            ${r.notas ? html`<div class="nolan-notas">${r.notas}</div>` : ""}
          </td>
        </tr>`;
      })}</tbody>
    </table>
  </section>`;
}
```

```js
html`${nolan.figuras.map(ficha)}`
```

## Ressalvas

- **Quem responde somos nós.** Nenhum dos políticos respondeu ao questionário. A escolha da evidência e o uso de "em parte" são julgamentos, e é por isso que cada resposta mostra a fonte.
- **A intensidade é um julgamento.** Decidir se uma resposta vale 1 ou 2 segue a regra acima, mas há casos de fronteira. Cada ficha mostra quais respostas valem 2.
- **Intensidade não é força da evidência.** O peso 2 mede o quanto a posição é radical, não o quanto a fonte é boa. Um voto nominal e uma frase em entrevista podem valer o mesmo. O tipo de evidência aparece em cada linha para quem quiser descontar.
- **As posições mudam com o tempo.** Algumas respostas usam falas de 2008; outras, de 2026. Quando houve mudança documentada, ela está registrada na ficha, e vale a posição mais recente.
- **Os itens foram escolhidos por nós.** Outros oito temas poderiam produzir outro diagrama. A lista de afirmações está aberta a crítica.
- **"Sem registro" puxa para o meio.** Resposta sem registro vale 0, então quem tem poucas respostas fica perto do centro. O número de respostas com registro aparece ao lado de cada nota, e os pontos vazados marcam os casos com menos de 6 em algum eixo.

## Referências

```js
html`<ol class="refs">${refs.map((r, i) => html`<li id=${`ref-${i + 1}`}>
  ${r.fonte_veiculo}${r.data ? ` (${r.data.slice(0, 4)})` : ""}. <a href=${r.url} target="_blank" rel="noopener">${r.fonte_titulo}</a>. Usada em: ${r.usos.join("; ")}.
</li>`)}</ol>`
```
