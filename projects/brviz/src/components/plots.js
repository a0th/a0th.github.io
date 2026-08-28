import * as d3 from "npm:d3";
import * as Plot from "npm:@observablehq/plot";
import { fmtIdx } from "./data.js";

function braColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--bra").trim() || "#1e3a8a";
}

function plotHeight(width) {
  return Math.round(Math.max(260, Math.min(380, (width ?? 640) * 0.7)));
}

function barMargins(width, marginLeft) {
  const w = width ?? 640;
  return {
    marginLeft: Math.min(marginLeft, Math.max(72, Math.round(w * 0.32))),
    marginRight: w < 480 ? 36 : 48,
  };
}

function peerColors(isos) {
  const n = Math.max(isos.length, 2);
  return d3.scaleOrdinal(isos, d3.quantize(d3.interpolateHcl("#cfe8f9", "#6ba8d4"), n));
}

const REFERENCE_ISOS = new Set(["LCN", "OECD", "MEAN"]);
const REFERENCE_COLOR = "#b45309";

export function metricPlot(
  rows,
  { width, yLabel, format, rules = [], yRules = [], colorful = false, markRefs = false } = {},
) {
  rows = rows.filter((d) => d.iso !== "UMC");
  const BRA = braColor();
  const rest = rows.filter((d) => d.iso !== "BRA");
  const bra = rows.filter((d) => d.iso === "BRA");
  const others = d3.sort(new Set(rest.map((d) => d.name)));
  const wash = colorful ? null : peerColors(d3.sort(new Set(rest.map((d) => d.iso))));
  const lastBra = bra.filter((d) => d.year === d3.max(bra, (d) => d.year));
  const refs = markRefs
    ? [...new Set(rows.filter((d) => REFERENCE_ISOS.has(d.iso)).map((d) => d.iso))].flatMap(
        (iso) => {
          const mine = rows.filter((d) => d.iso === iso);
          const y = d3.max(mine, (d) => d.year);
          return mine.filter((d) => d.year === y);
        },
      )
    : [];
  const braZ = colorful ? "Brasil" : "BRA";
  const refZ = markRefs
    ? new Set([...REFERENCE_ISOS, "América Latina", "Média OCDE", "Média simples"])
    : new Set();

  function restoreLines(svg) {
    const path = d3.select(svg).selectAll("[aria-label=line] path");
    path.style("stroke-opacity", null).style("stroke-width", null);
    path
      .filter(function () {
        return refZ.has(this.__z);
      })
      .raise();
    path
      .filter(function () {
        return this.__z === braZ;
      })
      .raise();
  }

  const strokeOf = (d) => {
    if (d.iso === "BRA") return BRA;
    if (markRefs && REFERENCE_ISOS.has(d.iso)) return REFERENCE_COLOR;
    return colorful ? d.name : wash(d.iso);
  };
  const pct = typeof yLabel === "string" && yLabel.includes("%");
  const tipValue = (v) => {
    if (v == null) return "—";
    if (typeof format === "function") return format(v);
    const n = v.toLocaleString("pt-BR", { maximumFractionDigits: pct ? 1 : 0 });
    return pct ? `${n}%` : n;
  };
  const plot = Plot.plot({
    width,
    height: plotHeight(width),
    marginLeft: 56,
    marginRight: 72,
    x: { label: null, tickFormat: "d" },
    y: { grid: true, label: yLabel, tickFormat: format },
    color: colorful
      ? {
          legend: true,
          label: null,
          columns: (width ?? 640) < 480 ? 2 : 4,
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
        stroke: colorful ? "name" : strokeOf,
        strokeWidth: colorful ? 1.7 : 1.15,
        strokeOpacity: colorful ? 0.45 : 0.7,
        title: (d) => `${d.name}\n${d.year}: ${tipValue(d.value)}`,
        render(index, scales, values, dimensions, context, next) {
          const g = next(index, scales, values, dimensions, context);
          const paths = d3.select(g).selectAll("path");
          paths.each(function ([i]) {
            this.__z = values.z[i];
          });
          paths
            .filter(([i]) => refZ.has(values.z[i]))
            .attr("stroke-width", 2.4)
            .attr("stroke-opacity", 0.95)
            .attr("stroke-dasharray", "6,4")
            .attr("stroke", REFERENCE_COLOR)
            .raise();
          paths
            .filter(([i]) => values.z[i] === braZ)
            .attr("stroke-width", colorful ? 4.5 : 3)
            .attr("stroke-opacity", 1)
            .raise();
          return g;
        },
        tip: {
          render(index, scales, values, dimensions, context, next) {
            const svg = context.ownerSVGElement;
            const path = d3.select(svg).selectAll("[aria-label=line] path");
            const sticky = svg.__pointerType && svg.__pointerType !== "mouse";
            if (!index.length) {
              svg.__stickyZ = null;
              restoreLines(svg);
              return next(index, scales, values, dimensions, context);
            }
            const z = values.z[index[0]];
            if (sticky && svg.__clearedDown === svg.__downId) {
              restoreLines(svg);
              return next([], scales, values, dimensions, context);
            }
            if (sticky && svg.__stickyZ === z && svg.__consumedDown !== svg.__downId) {
              svg.__clearedDown = svg.__downId;
              svg.__consumedDown = svg.__downId;
              svg.__stickyZ = null;
              restoreLines(svg);
              return next([], scales, values, dimensions, context);
            }
            if (sticky) {
              svg.__consumedDown = svg.__downId;
              svg.__stickyZ = z;
            }
            path
              .style("stroke-opacity", 0.12)
              .filter(([i]) => values.z[i] === z)
              .style("stroke-opacity", 1)
              .style("stroke-width", 3.2)
              .raise();
            return next(index, scales, values, dimensions, context);
          },
        },
      }),
      Plot.dot(lastBra, { x: "year", y: "value", fill: colorful ? "name" : BRA, r: 4 }),
      Plot.dot(refs, { x: "year", y: "value", fill: REFERENCE_COLOR, r: 3.5 }),
      Plot.text(lastBra, {
        x: "year",
        y: "value",
        text: "name",
        dy: -12,
        fill: colorful ? "name" : BRA,
      }),
      ...(markRefs
        ? [
            Plot.text(refs, {
              x: "year",
              y: "value",
              text: "name",
              dy: 14,
              fill: REFERENCE_COLOR,
            }),
          ]
        : []),
    ],
  });
  return stickyLineDismiss(plot, restoreLines);
}

function stickyLineDismiss(node, restoreLines) {
  const svg = node.tagName?.toLowerCase() === "svg" ? node : node.querySelector("svg");
  svg.addEventListener(
    "pointerdown",
    (event) => {
      svg.__pointerType = event.pointerType;
      svg.__downId = (svg.__downId ?? 0) + 1;
    },
    true,
  );
  const onDoc = (event) => {
    if (!node.isConnected) {
      document.removeEventListener("pointerdown", onDoc, true);
      return;
    }
    if (event.pointerType === "mouse" || node.contains(event.target) || !svg.__stickyZ) return;
    svg.__stickyZ = null;
    restoreLines(svg);
    d3.select(svg).selectAll("[aria-label=tip]").remove();
  };
  document.addEventListener("pointerdown", onDoc, true);
  return node;
}

export function barDelta(
  rows,
  {
    width,
    xLabel = "variação 2003–2010 (%)",
    format = (v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`,
    descending = true,
    marginLeft = 88,
  } = {},
) {
  const BRA = braColor();
  const ordered = d3.sort(rows, (d) => (descending ? -d.value : d.value));
  const toned = rows.some((d) => d.tone);
  const others = d3.sort(rows.filter((d) => d.iso !== "BRA").map((d) => d.name));
  const fillOf = (d) => {
    if (d.tone === "bra") return BRA;
    if (d.tone === "group") return "#94a3b8";
    if (d.tone === "peer") return "#6ba8d4";
    return undefined;
  };
  const { marginLeft: left, marginRight } = barMargins(width, marginLeft);
  const rowH = (width ?? 640) < 480 ? 30 : 36;
  return Plot.plot({
    width,
    height: rowH * rows.length + (rowH === 30 ? 40 : 48),
    marginLeft: left,
    marginRight,
    x: { label: xLabel, grid: true },
    y: { label: null, domain: ordered.map((d) => d.name) },
    color: toned
      ? undefined
      : { legend: false, domain: ["Brasil", ...others], range: [BRA, ...d3.schemeTableau10] },
    marks: [
      Plot.barX(ordered, {
        y: "name",
        x: "value",
        fill: toned ? fillOf : "name",
        fillOpacity: (d) => (d.iso === "BRA" ? 1 : 0.55),
      }),
      Plot.text(ordered, {
        y: "name",
        x: "value",
        text: (d) => format(d.value),
        dx: 8,
        textAnchor: "start",
        fill: "currentColor",
      }),
      Plot.ruleX([0]),
    ],
  });
}

function dotsPlot(
  rows,
  {
    width,
    x,
    y,
    xLabel,
    yLabel,
    labels = ["BRA", "KOR", "POL"],
    ruleY = [],
    regression = false,
    title,
  } = {},
) {
  const BRA = braColor();
  const bra = rows.filter((d) => d.iso === "BRA");
  const rest = rows.filter((d) => d.iso !== "BRA");
  const named = rows.filter((d) => labels.includes(d.iso));
  return Plot.plot({
    width,
    height: plotHeight(width),
    marginLeft: 48,
    marginRight: (width ?? 640) < 480 ? 40 : 56,
    x: { label: xLabel, grid: true },
    y: { label: yLabel, grid: true, nice: true },
    marks: [
      Plot.ruleY(ruleY, {
        stroke: "currentColor",
        strokeOpacity: 0.25,
        strokeDasharray: "4,4",
      }),
      ...(regression
        ? [
            Plot.linearRegressionY(rows, {
              x,
              y,
              stroke: "currentColor",
              strokeOpacity: 0.55,
              strokeWidth: 1.5,
              strokeDasharray: "6,4",
            }),
          ]
        : []),
      Plot.dot(rest, { x, y, fill: "#6ba8d4", fillOpacity: 0.8, r: 6 }),
      Plot.dot(bra, { x, y, fill: BRA, r: 8 }),
      Plot.text(named, {
        x,
        y,
        text: "name",
        dx: (d) => (d.iso === "BRA" ? -10 : 0),
        dy: (d) => (d.iso === "BRA" ? 0 : -12),
        textAnchor: (d) => (d.iso === "BRA" ? "end" : "middle"),
        fill: (d) => (d.iso === "BRA" ? BRA : "currentColor"),
      }),
      Plot.tip(rows, Plot.pointer({ x, y, title })),
    ],
  });
}

export function spendPisaPlot(rows, { width, oecd, xLabel = "% PIB", unit = "% PIB" } = {}) {
  return dotsPlot(rows, {
    width,
    x: "edu",
    y: "pisa",
    xLabel,
    yLabel: "PISA matemática",
    ruleY: oecd == null ? [] : [oecd],
    title: (d) =>
      `${d.name}\n${d.eduYear}: ${d.edu.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}\nPISA ${d.pisaYear}: ${fmtIdx(d.pisa)}`,
  });
}

export function invGrowthPlot(rows, { width, trend = false, zero = false } = {}) {
  const data = zero ? rows.map((d) => ({ ...d, ppp: d.ppp - 100 })) : rows;
  return dotsPlot(data, {
    width,
    x: "inv",
    y: "ppp",
    xLabel: "% PIB (média)",
    yLabel: zero
      ? "variação da renda per capita desde 1990 (%)"
      : "índice da renda per capita (1990 = 100)",
    ruleY: zero ? [0] : [100],
    regression: trend,
    title: (d) =>
      `${d.name}\ninv médio: ${d.inv.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%\nPPP: ${
        zero ? `${d.ppp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : fmtIdx(d.ppp)
      }`,
  });
}
