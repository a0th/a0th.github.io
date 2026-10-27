import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
process.stdout.write(readFileSync(join(root, "data/edu_intl.csv"), "utf8"));
