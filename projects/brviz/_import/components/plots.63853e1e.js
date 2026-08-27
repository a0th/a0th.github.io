import * as d3 from "../../_npm/d3@7.9.0/080cf928.js";
import * as Plot from "../../_npm/@observablehq/plot@0.6.17/93ce672e.js";
import { fmtIdx } from "./data.7b1d6155.js";

function braColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
}

function peerColors(isos) {
  const n = Math.max(isos.length, 2);
  return d3.scaleOrdinal(isos, d3.quantize(d3.interpolateHcl("#cfe8f9", "#6ba8d4"), n));
}

export function metricPlot(
  rows,
  { width, yLabel, format, rules = [], yRules = [], colorful = false } = {},
) {
  const BRA = braColor();
  const rest = rows.filter((d) => d.iso !== "BRA");
  const bra = rows.filter((d) => d.iso === "BRA");
  const others = d3.sort(new Set(rest.map((d) => d.name)));
  const wash = colorful ? null : peerColors(d3.sort(new Set(rest.map((d) => d.iso))));
  const lastBra = bra.filter((d) => d.year === d3.max(bra, (d) => d.year));
  const braZ = colorful ? "Brasil" : "BRA";
  const pct = typeof yLabel === "string" && yLabel.includes("%");
  const tipValue = (v) => {
    if (v == null) return "—";
    if (typeof format === "function") return format(v);
    const n = v.toLocaleString("pt-BR", { maximumFractionDigits: pct ? 1 : 0 });
    return pct ? `${n}%` : n;
  };
  return Plot.plot({
    width,
    height: 380,
    marginLeft: 56,
    marginRight: 16,
    x: { label: null, tickFormat: "d" },
    y: { grid: true, label: yLabel, tickFormat: format },
    color: colorful
      ? {
          legend: true,
          label: null,
          columns: 4,
          domain: ["Brasil", ...others],
          range: [BRA, ...d3.schemeTableau10],
        }
      : undefined,
    marks: [
      Plot.ruleX(rules, { stroke: "currentColor", strokeOpacity: 0.25, strokeDasharray: "4,4" }),
      Plot.ruleY(yRules, { stroke: "currentColor", strokeOpacity: 0.25 }),
      Plot.lineY(rows, {
        x: "year",
        y: "value",
        z: colorful ? "name" : "iso",
        stroke: colorful ? "name" : (d) => (d.iso === "BRA" ? BRA : wash(d.iso)),
        strokeWidth: colorful ? 1.7 : 1.15,
        strokeOpacity: colorful ? 0.45 : 0.7,
        title: (d) => `${d.name}\n${d.year}: ${tipValue(d.value)}`,
        render(index, scales, values, dimensions, context, next) {
          const g = next(index, scales, values, dimensions, context);
          d3.select(g)
            .selectAll("path")
            .filter(([i]) => values.z[i] === braZ)
            .attr("stroke-width", colorful ? 4.5 : 3)
            .attr("stroke-opacity", 1)
            .raise();
          return g;
        },
        tip: {
          render(index, scales, values, dimensions, context, next) {
            const path = d3.select(context.ownerSVGElement).selectAll("[aria-label=line] path");
            if (index.length) {
              const z = values.z[index[0]];
              path
                .style("stroke-opacity", 0.12)
                .filter(([i]) => values.z[i] === z)
                .style("stroke-opacity", 1)
                .style("stroke-width", 3.2)
                .raise();
            } else {
              path.style("stroke-opacity", null).style("stroke-width", null);
              path.filter(([i]) => values.z[i] === braZ).raise();
            }
            return next(index, scales, values, dimensions, context);
          },
        },
      }),
      Plot.dot(lastBra, { x: "year", y: "value", fill: colorful ? "name" : BRA, r: 4 }),
      Plot.text(lastBra, {
        x: "year",
        y: "value",
        text: "name",
        dy: -12,
        fill: colorful ? "name" : BRA,
      }),
    ],
  });
}

export function barDelta(rows, { width } = {}) {
  const BRA = braColor();
  const ordered = d3.sort(rows, (d) => -d.value);
  const others = d3.sort(rows.filter((d) => d.iso !== "BRA").map((d) => d.name));
  return Plot.plot({
    width,
    height: 36 * rows.length + 48,
    marginLeft: 88,
    marginRight: 48,
    x: { label: "variação 2003–2010 (%)", grid: true },
    y: { label: null, domain: ordered.map((d) => d.name) },
    color: { legend: false, domain: ["Brasil", ...others], range: [BRA, ...d3.schemeTableau10] },
    marks: [
      Plot.barX(ordered, {
        y: "name",
        x: "value",
        fill: "name",
        fillOpacity: (d) => (d.iso === "BRA" ? 1 : 0.5),
      }),
      Plot.text(ordered, {
        y: "name",
        x: "value",
        text: (d) => `${d.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`,
        dx: 8,
        textAnchor: "start",
        fill: "currentColor",
      }),
      Plot.ruleX([0]),
    ],
  });
}

export function spendPisaPlot(rows, { width, oecd } = {}) {
  const BRA = braColor();
  const bra = rows.filter((d) => d.iso === "BRA");
  const rest = rows.filter((d) => d.iso !== "BRA");
  const labels = rows.filter((d) => ["BRA", "KOR", "POL"].includes(d.iso));
  return Plot.plot({
    width,
    height: 380,
    marginLeft: 48,
    marginRight: 56,
    x: { label: "% PIB", grid: true },
    y: { label: "PISA math", grid: true },
    marks: [
      Plot.ruleY(oecd == null ? [] : [oecd], {
        stroke: "currentColor",
        strokeOpacity: 0.25,
        strokeDasharray: "4,4",
      }),
      Plot.dot(rest, { x: "edu", y: "pisa", fill: "#6ba8d4", fillOpacity: 0.8, r: 6 }),
      Plot.dot(bra, { x: "edu", y: "pisa", fill: BRA, r: 8 }),
      Plot.text(labels, {
        x: "edu",
        y: "pisa",
        text: "name",
        dy: -12,
        fill: (d) => (d.iso === "BRA" ? BRA : "currentColor"),
      }),
      Plot.tip(
        rows,
        Plot.pointer({
          x: "edu",
          y: "pisa",
          title: (d) =>
            `${d.name}\n${d.eduYear}: ${d.edu.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% PIB\nPISA ${d.pisaYear}: ${fmtIdx(d.pisa)}`,
        }),
      ),
    ],
  });
}
