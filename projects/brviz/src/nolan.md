---
toc:
  label: Nesta página
---

# Diagrama de Nolan: políticos brasileiros

```js
const nolan = await FileAttachment("./data/nolan.json").json();

const PONTOS = {concordo: 100, em_parte: 50, discordo: 0};
const RESPOSTA = {concordo: "Concorda", em_parte: "Em parte", discordo: "Discorda", sem_registro: "Sem registro"};
const TIPO = {voto: "Voto", ato: "Ato ou projeto", declaracao: "Declaração", programa: "Programa de campanha"};
const EIXO = {economico: "Econômico", pessoal: "Pessoal"};

const itens = new Map(nolan.itens.map((d) => [d.id, d]));

function nota(item, resposta) {
  const v = PONTOS[resposta];
  if (v === undefined) return null;
  return item.sentido === "liberdade" ? v : 100 - v;
}

const linhas = nolan.figuras.flatMap((f) =>
  f.respostas.map((r) => {
    const item = itens.get(r.item);
    return {...r, figura: f.curto, eixo: item.eixo, texto: item.texto, nota: nota(item, r.resposta)};
  })
);

const placar = nolan.figuras.map((f) => {
  const eixo = (e) => {
    const v = linhas.filter((l) => l.figura === f.curto && l.eixo === e && l.nota !== null);
    return {nota: d3.mean(v, (d) => d.nota), n: v.length};
  };
  const ec = eixo("economico");
  const pe = eixo("pessoal");
  return {curto: f.curto, economico: ec.nota, n_economico: ec.n, pessoal: pe.nota, n_pessoal: pe.n};
});

const P = new Map(placar.map((d) => [d.curto, d]));
const fmt = (x) => Math.round(x).toString();

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

**Como cada resposta é decidida.** Vale primeiro o voto nominal no Congresso, depois o ato de governo (decreto, sanção, projeto enviado), em seguida a declaração pública explícita e, por último, o programa de campanha registrado. "Em parte" só é usado quando há registro de posição condicional ou de mudança de posição. Sem registro público claro, a resposta fica em branco: não deduzimos a opinião de alguém pelo partido.

**Como a nota é calculada.** Cada resposta vale 100, 50 ou 0 pontos de liberdade; nos itens escritos a favor de mais Estado, a conta é invertida. A nota de cada eixo é a média das respostas com registro, de 0 a 100.

## O diagrama

```js
function diagrama(width) {
  const quadrantes = [
    {x: 88, y: 94, t: "Libertário"},
    {x: 12, y: 94, t: "Esquerda"},
    {x: 88, y: 4, t: "Direita"},
    {x: 12, y: 4, t: "Estatista"}
  ];
  const S = Math.min(width, 560);
  const M = {top: 20, right: 20, bottom: 44, left: 48};
  const iw = S - M.left - M.right, ih = S - M.top - M.bottom;
  const px = (x) => M.left + (x / 100) * iw;
  const py = (y) => M.top + (1 - y / 100) * ih;
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
    return {curto: d.curto, anchor: p[0], x: ((cx + p[1] - M.left) / iw) * 100, y: (1 - (cy + p[2] - M.top) / ih) * 100};
  });
  return Plot.plot({
    width: S,
    height: S,
    marginTop: M.top,
    marginRight: M.right,
    marginLeft: M.left,
    marginBottom: M.bottom,
    x: {domain: [0, 100], label: "Liberdade econômica →", ticks: [0, 25, 50, 75, 100]},
    y: {domain: [0, 100], label: "↑ Liberdade pessoal", ticks: [0, 25, 50, 75, 100]},
    marks: [
      Plot.frame({stroke: "currentColor", strokeOpacity: 0.2}),
      Plot.ruleX([50], {strokeOpacity: 0.25, strokeDasharray: "4,4"}),
      Plot.ruleY([50], {strokeOpacity: 0.25, strokeDasharray: "4,4"}),
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

No eixo econômico, os políticos se espalham de ponta a ponta: Jones Manoel fica em ${fmt(P.get("Jones Manoel").economico)}, Lula em ${fmt(P.get("Lula").economico)}, Zema em ${fmt(P.get("Zema").economico)} e Kim Kataguiri em ${fmt(P.get("Kim Kataguiri").economico)}. No eixo pessoal, quase todos ficam perto do meio, e Lula (${fmt(P.get("Lula").pessoal)}) fica quase na mesma altura que Bolsonaro (${fmt(P.get("Bolsonaro").pessoal)}) e Tarcísio (${fmt(P.get("Tarcísio").pessoal)}). O mapa abaixo mostra por quê.

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
    color: {type: "linear", domain: [0, 50, 100], range: ["#b45309", "#f1f1ef", "#1e3a8a"], interpolate: "rgb"},
    marks: [
      Plot.cell(comRegistro, {x: "item", y: "figura", fill: "nota", inset: 1.5, rx: 3}),
      Plot.cell(semRegistro, {x: "item", y: "figura", fill: "none", stroke: "currentColor", strokeOpacity: 0.2, strokeDasharray: "3,3", inset: 3, rx: 3}),
      Plot.text(comRegistro, {x: "item", y: "figura", text: (d) => d.nota, fill: (d) => (d.nota === 50 ? "#333" : "white"), fontSize: 11, fontWeight: 600}),
      Plot.text(semRegistro, {x: "item", y: "figura", text: () => "—", fillOpacity: 0.5}),
      Plot.tip(linhas, Plot.pointer({
        x: "item",
        y: "figura",
        title: (d) => `${d.figura} · ${d.item}\n${d.texto}\n${RESPOSTA[d.resposta]}${d.nota === null ? "" : ` → ${d.nota} pontos de liberdade`}`
      }))
    ]
  });
}
```

<div class="card" style="overflow-x:auto">${resize((width) => mapa(width))}</div>

Azul é mais liberdade, laranja é mais Estado, e o tracejado indica que não há registro. As oito primeiras colunas são o eixo econômico; as oito últimas, o pessoal.

No eixo econômico, a maioria fica quase toda de uma cor; Ciro Gomes, Haddad e Marina Silva misturam, com muitas respostas "em parte". No pessoal, o padrão é outro. Bolsonaro, Nikolas Ferreira, Tarcísio, Zema e Ratinho Jr. marcam liberdade em armas, educação em casa e redes sociais, e Estado em drogas, aborto e cassinos. Lula, Erika Hilton, Jones Manoel e Ciro Gomes fazem quase o inverso. As médias ficam no meio, mas descrevem posições opostas.

<div class="finding piloto">

**A média do eixo pessoal esconde duas direções.** O eixo econômico separa bem os políticos. O pessoal junta temas que não andam juntos no Brasil: quem defende armas e liberdade nas redes é contra descriminalizar a maconha e o aborto, e vice-versa. Kim Kataguiri é o único que fica alto nos dois eixos, perto do canto libertário. Marina Silva é o caso oposto: fica do lado do Estado nas duas direções, contra armas e também contra liberar drogas e aborto.

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
          <td><span class=${`nolan-resp ${r.resposta}`}>${RESPOSTA[r.resposta]}</span>${r.nota === null ? "" : html`<div class="nolan-pontos">${r.nota} pts</div>`}${r.confianca === "baixa" ? html`<div class="nolan-pontos">evidência fraca</div>` : ""}</td>
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
- **As evidências têm pesos diferentes.** Um voto nominal é mais forte que uma frase em entrevista, mas os dois valem o mesmo na nota. O tipo de evidência aparece em cada linha para quem quiser descontar.
- **As posições mudam com o tempo.** Algumas respostas usam falas de 2008; outras, de 2026. Quando houve mudança documentada, ela está registrada na ficha, e vale a posição mais recente.
- **Os itens foram escolhidos por nós.** Outros oito temas poderiam produzir outro diagrama. A lista de afirmações está aberta a crítica.
- **"Sem registro" reduz a base.** A nota de cada eixo usa só as respostas com registro, e o número de itens usados aparece ao lado de cada nota.

## Referências

```js
html`<ol class="refs">${refs.map((r, i) => html`<li id=${`ref-${i + 1}`}>
  ${r.fonte_veiculo}${r.data ? ` (${r.data.slice(0, 4)})` : ""}. <a href=${r.url} target="_blank" rel="noopener">${r.fonte_titulo}</a>. Usada em: ${r.usos.join("; ")}.
</li>`)}</ol>`
```
