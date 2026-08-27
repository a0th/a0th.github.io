import {readFileSync} from "node:fs";

process.stdout.write(readFileSync("data/pisa.csv", "utf8"));
