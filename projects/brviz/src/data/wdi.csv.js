import {readFileSync} from "node:fs";

const keep = /^(metric|gdp_pc_ppp|gdp_per_employed|investment|trade|edu_spend|gini|poverty_830|undernourish|reg_quality|start_days|efw),/;
const text = readFileSync("data/wdi.csv", "utf8");
process.stdout.write(text.split("\n").filter((line) => keep.test(line)).join("\n"));
if (!text.endsWith("\n")) process.stdout.write("\n");
