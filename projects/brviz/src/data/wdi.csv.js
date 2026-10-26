import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const keep =
  /^(metric|gdp_pc_ppp|gdp_per_employed|investment|trade|savings|manufacturing|edu_spend|edu_pupil_sec|gini|poverty_830|undernourish|reg_quality|rule_of_law|tot|tfp|start_days|efw|gg_rev|gg_exp|gg_debt|gg_balance|gg_primary|fpp_rev|fpp_exp|fpp_interest|pub_inv|priv_inv|homicides|homicides_male|homicides_female|pol_stability|pop|patents_res|rnd|researchers|sci_articles),/;
const text = readFileSync(join(root, "data/wdi.csv"), "utf8");
process.stdout.write(text.split("\n").filter((line) => keep.test(line)).join("\n"));
if (!text.endsWith("\n")) process.stdout.write("\n");
