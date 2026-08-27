import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const keep =
  /^(metric|gdp_pc_ppp|gdp_per_employed|investment|trade|savings|manufacturing|edu_spend|gini|poverty_830|undernourish|reg_quality|rule_of_law|tot|tfp|start_days|efw),/;
const text = readFileSync(join(root, "data/wdi.csv"), "utf8");
process.stdout.write(text.split("\n").filter((line) => keep.test(line)).join("\n"));
if (!text.endsWith("\n")) process.stdout.write("\n");
